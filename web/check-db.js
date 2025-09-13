const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDatabase() {
  const mongoUri = process.env.MONGODB_URI || process.env.DB_URL;
  
  if (!mongoUri) {
    console.error('Error: MongoDB URI not found in environment variables');
    console.error('Please set MONGODB_URI or DB_URL in your .env.local file');
    return;
  }
  
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db('xenocrm');
    
    // Check customers
    const customerCount = await db.collection('customers').countDocuments();
    console.log('Total customers:', customerCount);
    
    if (customerCount > 0) {
      const sampleCustomers = await db.collection('customers').find({}).limit(2).toArray();
      console.log('Sample customers:', sampleCustomers.map(c => ({
        name: c.name,
        email: c.email,
        totalSpends: c.totalSpends,
        visitCount: c.visitCount
      })));
    }
    
    // Check campaigns
    const campaignCount = await db.collection('campaigns').countDocuments();
    console.log('Total campaigns:', campaignCount);
    
    if (campaignCount > 0) {
      const campaigns = await db.collection('campaigns').find({}).toArray();
      console.log('Campaigns:', campaigns.map(c => ({
        name: c.name,
        audienceSize: c.audienceSize,
        status: c.status,
        hasRules: !!c.audienceRules
      })));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkDatabase();