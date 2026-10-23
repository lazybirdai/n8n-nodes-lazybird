import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { accountOperations } from './descriptions/AccountDescription';
import { speechFields, speechOperations } from './descriptions/SpeechDescription';
import { voiceFields, voiceOperations } from './descriptions/VoiceDescription';
import { searchMyVoices, searchVoices } from './listSearch/searchVoices';
import { lazybirdApiRequest } from './shared/transport';
import type { Voice } from './shared/types';

export class Lazybird implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Lazybird',
		name: 'lazybird',
		icon: { light: 'file:../../icons/lazybird.svg', dark: 'file:../../icons/lazybird.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Generate natural AI voiceovers and clone or design voices with Lazybird',
		defaults: {
			name: 'Lazybird',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'lazybirdApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Speech', value: 'speech' },
					{ name: 'Voice', value: 'voice' },
				],
				default: 'speech',
			},
			...accountOperations,
			...speechOperations,
			...speechFields,
			...voiceOperations,
			...voiceFields,
		],
	};

	methods = {
		listSearch: {
			searchVoices,
			searchMyVoices,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				let output: INodeExecutionData[];

				if (resource === 'speech' && operation === 'generate') {
					output = [await generateSpeech.call(this, i)];
				} else if (resource === 'voice') {
					output = await voiceOperation.call(this, operation, i);
				} else if (resource === 'account' && operation === 'get') {
					const account = (await lazybirdApiRequest.call(this, 'GET', '/me', {}, i)) as IDataObject;
					output = [{ json: account, pairedItem: { item: i } }];
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`The operation "${operation}" is not supported for "${resource}"`,
						{ itemIndex: i },
					);
				}

				for (const item of output) returnData.push({ ...item, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				// Errors from the API helper are already NodeApiErrors; wrapping hands them back unchanged.
				if (error instanceof NodeApiError)
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject);
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

async function generateSpeech(this: IExecuteFunctions, i: number): Promise<INodeExecutionData> {
	const voiceId = this.getNodeParameter('voice', i, '', { extractValue: true }) as string;
	const inputType = this.getNodeParameter('inputType', i) as string;
	const input = this.getNodeParameter(inputType, i) as string;
	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
	const { fileName, ...settings } = this.getNodeParameter('options', i, {}) as IDataObject;

	if (!input.trim()) {
		throw new NodeOperationError(
			this.getNode(),
			`The ${inputType === 'ssml' ? 'SSML' : 'text'} is empty`,
			{
				itemIndex: i,
			},
		);
	}
	if (settings.locale === '') delete settings.locale;
	if (settings.style === '') delete settings.style;

	const body: IDataObject = { voiceId, [inputType]: input };
	if (Object.keys(settings).length) body.settings = settings;

	const audio = (await lazybirdApiRequest.call(
		this,
		'POST',
		'/generate-speech',
		{ body, binary: true },
		i,
	)) as Buffer;
	const binary = await this.helpers.prepareBinaryData(
		Buffer.from(audio),
		(fileName as string) || 'speech.mp3',
		'audio/mpeg',
	);

	return {
		json: {
			voiceId,
			characters: input.length,
			fileName: binary.fileName,
			fileSize: audio.byteLength,
		},
		binary: { [binaryPropertyName]: binary },
	};
}

async function voiceOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<INodeExecutionData[]> {
	const voiceId = () => this.getNodeParameter('voice', i, '', { extractValue: true }) as string;
	const voicePath = () => `/voices/${encodeURIComponent(voiceId())}`;
	const single = (response: unknown) => [
		{ json: ((response as IDataObject).voice ?? response) as IDataObject },
	];

	switch (operation) {
		case 'get':
			return single(await lazybirdApiRequest.call(this, 'GET', voicePath(), {}, i));

		case 'getAll':
			return (await getVoices.call(this, i)).map((voice) => ({
				json: voice as unknown as IDataObject,
			}));

		case 'clone':
			return single(await cloneVoice.call(this, i));

		case 'design':
			return [await designVoice.call(this, i)];

		case 'update': {
			const fields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
			if (!Object.keys(fields).length) {
				throw new NodeOperationError(this.getNode(), 'Add at least one field to update', {
					itemIndex: i,
				});
			}
			return single(await lazybirdApiRequest.call(this, 'PATCH', voicePath(), { body: fields }, i));
		}

		case 'delete':
			return [
				{
					json: {
						id: voiceId(),
						...((await lazybirdApiRequest.call(this, 'DELETE', voicePath(), {}, i)) as IDataObject),
					},
				},
			];

		case 'publish':
		case 'unpublish':
			return single(
				await lazybirdApiRequest.call(this, 'POST', `${voicePath()}/${operation}`, {}, i),
			);

		default:
			throw new NodeOperationError(
				this.getNode(),
				`The operation "${operation}" is not supported for "voice"`,
				{
					itemIndex: i,
				},
			);
	}
}

async function getVoices(this: IExecuteFunctions, i: number): Promise<Voice[]> {
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const filters = this.getNodeParameter('filters', i, {}) as {
		source?: string;
		language?: string;
		gender?: string;
		search?: string;
	};

	let voices = (await lazybirdApiRequest.call(
		this,
		'GET',
		'/voices',
		{ qs: filters.source === 'mine' ? { owner: 'me' } : {} },
		i,
	)) as Voice[];

	if (filters.source === 'library') voices = voices.filter((voice) => voice.scope === 'global');
	if (filters.source === 'community')
		voices = voices.filter((voice) => voice.scope === 'community');
	if (filters.gender) voices = voices.filter((voice) => voice.gender === filters.gender);
	if (filters.language) {
		const language = filters.language.trim().toLowerCase();
		voices = voices.filter((voice) => {
			const locale = (voice.language ?? '').toLowerCase();
			return locale === language || locale.startsWith(`${language}-`);
		});
	}
	if (filters.search) {
		const query = filters.search.trim().toLowerCase();
		voices = voices.filter((voice) =>
			[voice.displayName, voice.description, ...(voice.labels ?? [])].some((field) =>
				(field ?? '').toLowerCase().includes(query),
			),
		);
	}

	if (returnAll) return voices;
	return voices.slice(0, this.getNodeParameter('limit', i) as number);
}

async function cloneVoice(this: IExecuteFunctions, i: number): Promise<unknown> {
	const name = this.getNodeParameter('name', i) as string;
	const sampleSource = this.getNodeParameter('sampleSource', i) as string;
	const rightsConfirmed = this.getNodeParameter('rightsConfirmed', i) as boolean;

	if (!rightsConfirmed) {
		throw new NodeOperationError(
			this.getNode(),
			'Confirm that you own this voice or that the speaker consented to cloning it',
			{ itemIndex: i },
		);
	}

	if (sampleSource === 'url') {
		const sampleUrl = this.getNodeParameter('sampleUrl', i) as string;
		return await lazybirdApiRequest.call(
			this,
			'POST',
			'/voices',
			{ body: { name, sampleUrl, rightsConfirmed } },
			i,
		);
	}

	const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
	const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
	const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

	const form = new FormData();
	form.append('name', name);
	form.append('rightsConfirmed', 'true');
	form.append(
		'sample',
		new Blob([buffer], { type: binaryData.mimeType }),
		binaryData.fileName ?? 'sample',
	);

	return await lazybirdApiRequest.call(this, 'POST', '/voices', { body: form }, i);
}

async function designVoice(this: IExecuteFunctions, i: number): Promise<INodeExecutionData> {
	const description = this.getNodeParameter('description', i) as string;
	const text = this.getNodeParameter('text', i) as string;
	const { download, ...options } = this.getNodeParameter('designOptions', i, {}) as IDataObject;
	if (options.language === '') delete options.language;

	const result = (await lazybirdApiRequest.call(
		this,
		'POST',
		'/voices/design',
		{ body: { description, text, ...options } },
		i,
	)) as IDataObject;

	if (!download) return { json: result };

	const audio = (await this.helpers.httpRequest({
		method: 'GET',
		url: result.sampleUrl as string,
		encoding: 'arraybuffer',
	})) as Buffer;
	const binary = await this.helpers.prepareBinaryData(
		Buffer.from(audio),
		'voice-design.mp3',
		'audio/mpeg',
	);
	return { json: result, binary: { data: binary } };
}
