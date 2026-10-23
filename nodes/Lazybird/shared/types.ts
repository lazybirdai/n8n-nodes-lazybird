export interface Voice {
	id: string;
	displayName: string;
	description?: string;
	labels?: string[];
	/** Primary locale such as "en-US". */
	language?: string;
	gender?: string;
	/** "global" for the Lazybird library, "community" for voices shared by users, "user" for private voices. */
	scope?: string;
	mine?: boolean;
}
