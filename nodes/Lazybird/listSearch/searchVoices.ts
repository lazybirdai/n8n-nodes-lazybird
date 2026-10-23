import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { lazybirdApiRequest } from '../shared/transport';
import type { Voice } from '../shared/types';

const PAGE_SIZE = 100;

/** Your own voices first, then the Lazybird library and community voices. */
export async function searchVoices(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const [all, mine] = (await Promise.all([
		lazybirdApiRequest.call(this, 'GET', '/voices'),
		lazybirdApiRequest.call(this, 'GET', '/voices', { qs: { owner: 'me' } }),
	])) as [Voice[], Voice[]];
	const mineIds = new Set(mine.map((voice) => voice.id));
	const voices = [...mine, ...all.filter((voice) => !mineIds.has(voice.id))];
	return toPage(voices, mineIds, filter, paginationToken);
}

/** Only your own voices, for operations that change a voice. */
export async function searchMyVoices(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const mine = (await lazybirdApiRequest.call(this, 'GET', '/voices', {
		qs: { owner: 'me' },
	})) as Voice[];
	return toPage(mine, new Set(mine.map((voice) => voice.id)), filter, paginationToken);
}

function toPage(
	voices: Voice[],
	mineIds: Set<string>,
	filter?: string,
	paginationToken?: string,
): INodeListSearchResult {
	const query = (filter ?? '').trim().toLowerCase();
	const matches = query
		? voices.filter((voice) =>
				[voice.displayName, voice.language, voice.description, ...(voice.labels ?? [])]
					.filter(Boolean)
					.some((field) => (field as string).toLowerCase().includes(query)),
			)
		: voices;

	const start = paginationToken ? Number(paginationToken) : 0;
	const results: INodeListSearchItems[] = matches.slice(start, start + PAGE_SIZE).map((voice) => ({
		name: voiceLabel(voice, mineIds.has(voice.id)),
		value: voice.id,
	}));
	const next = start + PAGE_SIZE < matches.length ? String(start + PAGE_SIZE) : undefined;
	return { results, paginationToken: next };
}

function voiceLabel(voice: Voice, mine: boolean): string {
	const details = [voice.language, voice.description].filter(Boolean).join(', ');
	const name = details ? `${voice.displayName} (${details})` : voice.displayName;
	if (mine) return `${name} · My voice`;
	return voice.scope === 'community' ? `${name} · Community` : name;
}
