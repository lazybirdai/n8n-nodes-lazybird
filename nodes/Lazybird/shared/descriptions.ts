import type { INodeProperties } from 'n8n-workflow';

/** Voice picker: search the library and your own voices, or paste a voice ID. */
export function voiceSelect(
	displayOptions: INodeProperties['displayOptions'],
	searchListMethod = 'searchVoices',
): INodeProperties {
	return {
		displayName: 'Voice',
		name: 'voice',
		type: 'resourceLocator',
		default: { mode: 'list', value: '' },
		required: true,
		displayOptions,
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select a voice...',
				typeOptions: {
					searchListMethod,
					searchable: true,
				},
			},
			{
				displayName: 'By ID',
				name: 'id',
				type: 'string',
				placeholder: 'e.g. tgJ2Hes6DauwTg8kFrRPLN',
			},
		],
	};
}
