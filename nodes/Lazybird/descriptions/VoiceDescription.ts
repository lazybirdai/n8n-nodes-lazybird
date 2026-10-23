import type { INodeProperties } from 'n8n-workflow';
import { voiceSelect } from '../shared/descriptions';

const show = (...operation: string[]) => ({ show: { resource: ['voice'], operation } });

export const VOICE_LABELS = [
	'Advertising',
	'Adult',
	'Anime',
	'ASMR',
	'Audiobook',
	'Calm',
	'Character',
	'Child',
	'Customer Service',
	'Deep',
	'Documentary',
	'Education',
	'Elder',
	'Energetic',
	'Female',
	'Horror',
	'Kids',
	'Male',
	'Meditation',
	'Narrator',
	'News',
	'Podcast',
	'Sleep',
	'Storytelling',
	'Streamer',
	'Trailer',
	'Young Adult',
];

export const voiceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['voice'] } },
		options: [
			{
				name: 'Clone',
				value: 'clone',
				description: 'Create a voice from a recording of the speaker',
				action: 'Clone a voice',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete one of your voices',
				action: 'Delete a voice',
			},
			{
				name: 'Design',
				value: 'design',
				description: 'Create a voice sample from a text description',
				action: 'Design a voice',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a voice',
				action: 'Get a voice',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'List library, community and your own voices',
				action: 'Get many voices',
			},
			{
				name: 'Publish',
				value: 'publish',
				description: 'Share one of your voices in the community library',
				action: 'Publish a voice',
			},
			{
				name: 'Unpublish',
				value: 'unpublish',
				description: 'Take one of your voices out of the community library',
				action: 'Unpublish a voice',
			},
			{
				name: 'Update',
				value: 'update',
				description:
					'Change the name, description, labels, language or avatar of one of your voices',
				action: 'Update a voice',
			},
		],
		default: 'getAll',
	},
];

export const voiceFields: INodeProperties[] = [
	// voice:get
	voiceSelect(show('get')),

	// voice:delete, publish, unpublish, update
	voiceSelect(show('delete', 'publish', 'unpublish', 'update'), 'searchMyVoices'),

	// voice:getAll
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: show('getAll'),
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		displayOptions: { show: { resource: ['voice'], operation: ['getAll'], returnAll: [false] } },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: show('getAll'),
		options: [
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'options',
				options: [
					{ name: 'Female', value: 'female' },
					{ name: 'Male', value: 'male' },
				],
				default: 'female',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'e.g. en-US',
				description:
					'Locale or language code of the voice’s main language. "en" matches every English locale.',
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				placeholder: 'e.g. narrator',
				description: 'Text to find in the voice’s name, description or labels',
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: [
					{
						name: 'Community',
						value: 'community',
						description: 'Voices that Lazybird users shared',
					},
					{
						name: 'Lazybird Library',
						value: 'library',
						description: 'Lazybird’s own voices',
					},
					{ name: 'My Voices', value: 'mine', description: 'Voices you cloned or designed' },
				],
				default: 'library',
			},
		],
	},

	// voice:clone
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Podcast Host',
		displayOptions: show('clone'),
		description: 'Display name for the new voice',
	},
	{
		displayName: 'Sample Source',
		name: 'sampleSource',
		type: 'options',
		displayOptions: show('clone'),
		options: [
			{
				name: 'Binary File',
				value: 'binary',
				description: 'An MP3, WAV or OGG file from a previous node',
			},
			{ name: 'URL', value: 'url', description: 'A public link to an MP3, WAV or OGG file' },
		],
		default: 'binary',
	},
	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: { resource: ['voice'], operation: ['clone'], sampleSource: ['binary'] },
		},
		hint: 'The name of the input binary field that holds the recording (up to 20 MB)',
	},
	{
		displayName: 'Sample URL',
		name: 'sampleUrl',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/recording.mp3',
		displayOptions: { show: { resource: ['voice'], operation: ['clone'], sampleSource: ['url'] } },
		description: 'Public link to the recording',
	},
	{
		displayName: 'Rights Confirmed',
		name: 'rightsConfirmed',
		type: 'boolean',
		required: true,
		default: false,
		displayOptions: show('clone'),
		description:
			'Whether you own this voice or the speaker consented to cloning it. Required, and recorded on the voice. See the Lazybird Acceptable Use Policy.',
	},

	// voice:design
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 2 },
		required: true,
		default: '',
		placeholder: 'e.g. A calm middle-aged woman with a warm, low voice',
		displayOptions: show('design'),
		description:
			'Who is speaking: age, gender, pitch, energy, accent, emotion (up to 500 characters)',
	},
	{
		displayName: 'Sample Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		default: '',
		placeholder: 'e.g. Welcome back. Today we look at three simple ways to sleep better.',
		displayOptions: show('design'),
		description: 'What the sample says (up to 1,000 characters)',
	},
	{
		displayName: 'Options',
		name: 'designOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: show('design'),
		options: [
			{
				displayName: 'Download Sample',
				name: 'download',
				type: 'boolean',
				default: false,
				description: 'Whether to add the sample MP3 to the output as a binary field named "data"',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'e.g. en-US',
				description: 'Locale of the sample text. Detected when empty.',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2147483647 },
				default: 0,
				description:
					'Seed of an earlier result, to get the same voice again. Without it, each run designs a new voice.',
			},
		],
	},

	// voice:update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: show('update'),
		options: [
			{
				displayName: 'Avatar URL',
				name: 'avatarUrl',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://example.com/avatar.png',
				description: 'Public link to a PNG, JPEG or WebP image',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				placeholder: 'e.g. Energetic Ad Voice',
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'multiOptions',
				options: VOICE_LABELS.map((label) => ({ name: label, value: label })),
				default: [],
				description: 'Replaces the voice’s labels',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'e.g. en-US',
				description: 'Main locale of the voice',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
			},
		],
	},
];
