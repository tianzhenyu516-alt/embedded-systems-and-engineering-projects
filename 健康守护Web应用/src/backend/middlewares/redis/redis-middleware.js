export function createRedisMiddleware({ getClient, isAvailable }) {
    return (req, res, next) => {
        const client = typeof getClient === 'function' ? getClient() : null;
        const available = typeof isAvailable === 'function' ? isAvailable() : false;

        req.redis = client;
        req.redisAvailable = available;

        res.locals.redis = client;
        res.locals.redisAvailable = available;

        req.app.locals.redis = client;
        req.app.locals.redisAvailable = available;

        next();
    };
}
