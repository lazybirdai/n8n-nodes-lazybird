import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const BASE_URL = 'https://api.lazybird.app/v1';

interface LazybirdErrorBody {
	error?: string;
	code?: string;
	retryAfterSeconds?: number;
}

type RequestOptions = Pick<IHttpRequestOptions, 'body' | 'qs' | 'headers'> & {
	/** Return the response body as a Buffer (MP3 audio) instead of parsed JSON. */
	binary?: boolean;
};

/**
 * Calls the Lazybird API with the node's credentials. Errors come back as
 * NodeApiError with the API's own message, written for the person running the workflow.
 */
export async function lazybirdApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
	itemIndex?: number,
) {
	const { binary, ...rest } = options;
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'lazybirdApi', {
		method,
		url: `${BASE_URL}${path}`,
		json: !binary && !(rest.body instanceof FormData),
		encoding: binary ? 'arraybuffer' : undefined,
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		...rest,
	})) as { body: unknown; headers: IDataObject; statusCode: number };

	if (response.statusCode < 400) {
		// Multipart uploads are sent without `json`, so their JSON reply arrives as text.
		return typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
	}

	const body = parseErrorBody(response.body);
	throw new NodeApiError(this.getNode(), body as JsonObject, {
		message: errorMessage(response.statusCode, body),
		description: body.error,
		httpCode: String(response.statusCode),
		itemIndex,
	});
}

function parseErrorBody(body: unknown): LazybirdErrorBody {
	if (Buffer.isBuffer(body) || body instanceof ArrayBuffer) {
		try {
			return JSON.parse(Buffer.from(body as Buffer).toString('utf8')) as LazybirdErrorBody;
		} catch {
			return {};
		}
	}
	if (typeof body === 'string') {
		try {
			return JSON.parse(body) as LazybirdErrorBody;
		} catch {
			return { error: body };
		}
	}
	return (body ?? {}) as LazybirdErrorBody;
}

function errorMessage(status: number, body: LazybirdErrorBody): string {
	// "Authorization Error: …", "Invalid Input: …" read better without the prefix.
	const message = (body.error ?? '').replace(/^[A-Za-z ]+(?:Error|Input): /, '');
	switch (status) {
		case 401:
			return 'Your Lazybird API key is not valid. Check the credential.';
		case 422:
			return /credit/i.test(message)
				? 'You are out of Lazybird credits. Get more at lazybird.app/pricing, or wait for your monthly credits to reset.'
				: `${message || 'Your plan does not allow this request.'} See lazybird.app/pricing.`;
		case 429:
			return body.retryAfterSeconds
				? `Too many requests. Try again in ${body.retryAfterSeconds} seconds.`
				: 'Too many requests. Try again shortly.';
		case 503:
			return 'Lazybird is busy right now. Try again in a minute.';
		default:
			return message || `Lazybird request failed (${status})`;
	}
}
