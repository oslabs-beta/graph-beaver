import Redis from 'ioredis';
import { RateLimiterConfig } from '../@types/rateLimit';
import TokenBucket from '../rateLimiters/tokenBucket';

/**
 * Instatieate the rateLimiting algorithm class based on the developer selection and options
 *
 * @export
 * @param {RateLimiterSelection} selection
 * @param {RateLimiterOptions} options
 * @param {Redis} client
 * @return {*}
 */
export default function setupRateLimiter(
    rateLimiter: RateLimiterConfig,
    client: Redis,
    keyExpiry: number
) {
    switch (rateLimiter.type) {
        case 'TOKEN_BUCKET':
            // todo validate options
            return new TokenBucket(
                rateLimiter.bucketSize,
                rateLimiter.refillRate,
                client,
                keyExpiry
            );
            break;
        case 'LEAKY_BUCKET':
            throw new Error('Leaky Bucket algonithm has not be implemented.');
            break;
        case 'FIXED_WINDOW':
            throw new Error('Fixed Window algonithm has not be implemented.');
            break;
        case 'SLIDING_WINDOW_LOG':
            throw new Error('Sliding Window Log has not be implemented.');
            break;
        case 'SLIDING_WINDOW_COUNTER':
            throw new Error('Sliding Window Counter algonithm has not be implemented.');
            break;
        default:
            // typescript should never let us invoke this function with anything other than the options above
            throw new Error('Selected rate limiting algorithm is not suppported');
            break;
    }
}
