/**
 * Singleton cache class.
 */
class Cache {
    private static instance: Cache;
    private cache: Map<string, any>;

    private constructor() {
        this.cache = new Map<string, any>();
    }

    /**
     * Get the singleton instance of the cache.
     * @returns The cache instance.
     */
    public static getInstance(): Cache {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }
        return Cache.instance;
    }

    /**
     * Set a value in the cache.
     * @param key - The key to set.
     * @param value - The value to set.
     */
    public set<T>(key: string, value: T): void {
        this.cache.set(key, value);
    }

    /**
     * Get a value from the cache.
     * @param key - The key to get.
     * @returns The value associated with the key, or undefined if not found.
     */
    public get<T>(key: string): T | undefined {
        return this.cache.get(key);
    }

    /**
     * Clear the cache.
     */
    public clear(): void {
        this.cache.clear();
    }
}

export default Cache.getInstance();
