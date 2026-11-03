import { MongoClient } from 'mongodb';

const primaryUri = (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('cluster0.imudac1'))
  ? process.env.MONGODB_URI
  : 'mongodb+srv://webnexllc80_db_user:0761071Na@cluster0.dlhnyrp.mongodb.net/rich_room?retryWrites=true&w=majority&appName=Cluster0';
const fallbackUri = 'mongodb+srv://richroom35_db_user:sGBQ4YxdtBTqJKPU@cluster0.imudac1.mongodb.net/rich_room?retryWrites=true&w=majority&appName=Cluster0';

const options = {
  maxPoolSize: 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  retryWrites: true,
};

async function createClientWithFallback(targetUri) {
  const client = new MongoClient(targetUri, options);
  await client.connect();
  return client;
}

async function getConnectedClient() {
  if (global._mongoClientPromise) {
    try {
      const existingClient = await global._mongoClientPromise;
      if (existingClient && typeof existingClient.db === 'function') {
        return existingClient;
      }
    } catch {
      global._mongoClientPromise = null;
    }
  }

  global._mongoClientPromise = (async () => {
    try {
      return await createClientWithFallback(primaryUri);
    } catch (primaryErr) {
      console.warn('Primary MongoDB Atlas connection note:', primaryErr.message, '- attempting failover cluster...');
      try {
        return await createClientWithFallback(fallbackUri);
      } catch (fallbackErr) {
        console.error('All MongoDB Atlas connections failed:', fallbackErr.message);
        throw fallbackErr;
      }
    }
  })().catch((err) => {
    global._mongoClientPromise = null;
    throw err;
  });

  const connectedClient = await global._mongoClientPromise;
  if (!connectedClient || typeof connectedClient.db !== 'function') {
    global._mongoClientPromise = null;
    throw new Error('Failed to establish active MongoDB connection.');
  }

  return connectedClient;
}

/**
 * Returns the active MongoDB Database instance strictly from MongoDB Atlas.
 * Pure native MongoDB connection - zero file-system or JSON database fallbacks.
 */
export async function getDb() {
  const clientInstance = await getConnectedClient();
  return clientInstance.db();
}

const clientPromise = getConnectedClient();
export default clientPromise;
