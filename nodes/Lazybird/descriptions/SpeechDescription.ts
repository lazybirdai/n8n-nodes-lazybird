import type { INodeProperties } from 'n8n-workflow';
import { voiceSelect } from '../shared/descriptions';

const showForGenerate = { resource: ['speech'], operation: ['generate'] };

export const speechOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['speech'] } },
		options: [
			{
				name: 'Generate',
				value: 'generate',
				description: 'Turn text or SSML into an MP3 file',
				action: 'Generate speech',
			},
		],
		default: 'generate',
	},
];

export const speechFields: INodeProperties[] = [
	voiceSelect({ show: showForGenerate }),
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		displayOptions: { show: showForGenerate },
		options: [
			{ name: 'Text', value: 'text', description: 'Plain text to speak' },
			{
				name: 'SSML',
				value: 'ssml',
				description: 'SSML markup, for pauses and other speech control',
			},
		],
		default: 'text',
	},
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		placeholder: 'e.g. Welcome to the show.',
		displayOptions: { show: { ...showForGenerate, inputType: ['text'] } },
		description: 'The text to speak. Each character uses one credit.',
	},
	{
		displayName: 'SSML',
		name: 'ssml',
		type: 'string',
		typeOptions: { rows: 4 },
		required: true,
		default: '',
		placeholder: 'e.g. <speak>Welcome <break time="500ms"/> to the show.</speak>',
		displayOptions: { show: { ...showForGenerate, inputType: ['ssml'] } },
		description: 'Valid SSML wrapped in a speak element',
	},
	{
		displayName: 'Put Output File in Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: { show: showForGenerate },
		hint: 'The name of the output binary field to put the MP3 file in',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showForGenerate },
		options: [
			{
				displayName: 'File Name',
				name: 'fileName',
				type: 'string',
				default: 'speech.mp3',
				description: 'Name of the MP3 file in the output',
			},
			{
				displayName: 'Locale',
				name: 'locale',
				type: 'string',
				default: '',
				placeholder: 'e.g. es-ES',
				description:
					'Language and accent to speak in, as a BCP-47 locale. Useful for multilingual and cloned voices.',
			},
			{
				displayName: 'Pitch',
				name: 'pitch',
				type: 'number',
				typeOptions: { minValue: 0.5, maxValue: 1.5, numberPrecision: 2 },
				default: 1,
				description: '1 is the voice’s normal pitch',
			},
			{
				displayName: 'Speed',
				name: 'speed',
				type: 'number',
				typeOptions: { minValue: 0.5, maxValue: 2, numberPrecision: 2 },
				default: 1,
				description: '1 is normal speed',
			},
			{
				displayName: 'Style',
				name: 'style',
				type: 'string',
				default: '',
				placeholder: 'e.g. cheerful',
				description:
					'Speaking style, for voices that have styles. Get a voice to see its style list.',
			},
			{
				displayName: 'Style Intensity',
				name: 'styleIntensity',
				type: 'number',
				typeOptions: { minValue: 0.01, maxValue: 2, numberPrecision: 2 },
				default: 1,
				description: 'How strongly to apply the style',
			},
			{
				displayName: 'Volume',
				name: 'volume',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
				default: 1,
				description: '1 is the voice’s normal volume',
			},
		],
	},
];
