import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class LazybirdApi implements ICredentialType {
	name = 'lazybirdApi';

	displayName = 'Lazybird API';

	icon: Icon = { light: 'file:../icons/lazybird.svg', dark: 'file:../icons/lazybird.dark.svg' };

	documentationUrl = 'https://github.com/lazybirdai/n8n-nodes-lazybird#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Create a key in your Lazybird Studio settings',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.lazybird.app/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
