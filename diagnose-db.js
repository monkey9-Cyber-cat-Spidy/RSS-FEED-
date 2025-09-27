import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwcoyeeyrvzhueghtknm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y295ZWV5cnZ6aHVlZ2h0a25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzgzMzcsImV4cCI6MjA3NDU1NDMzN30.5EsKiweOlxJ4TRLLXeQrEhPcEVlFvaYEXFk5t4VPfZM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostics() {
  console.log('🔍 Running database diagnostics...\n');

  try {
    // Test 1: Check if tables exist
    console.log('📋 Test 1: Checking if tables exist...');
    
    const tables = ['user_profiles', 'articles', 'subscriptions', 'notifications'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}': ${error.message}`);
        } else {
          console.log(`✅ Table '${table}': EXISTS`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}': ${err.message}`);
      }
    }

    // Test 2: Test authentication
    console.log('\n🔐 Test 2: Testing authentication...');
    
    // Try to get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log(`⚠️ Auth check: ${authError.message}`);
    } else {
      console.log(`✅ Auth: ${user ? `Logged in as ${user.email}` : 'Not logged in'}`);
    }

    // Test 3: Test user creation (this will help identify the exact error)
    console.log('\n👤 Test 3: Testing user signup process...');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`Attempting to sign up with: ${testEmail}`);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'testuser',
          display_name: 'Test User'
        }
      }
    });

    if (signUpError) {
      console.log(`❌ Signup Error: ${signUpError.message}`);
      console.log(`Error details:`, signUpError);
    } else {
      console.log(`✅ Signup successful!`);
      console.log(`User ID: ${signUpData.user?.id}`);
      console.log(`Email confirmed: ${signUpData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
      
      // Clean up - delete the test user
      if (signUpData.user) {
        console.log('🧹 Cleaning up test user...');
        // Note: You might need to manually delete this user from Supabase dashboard
      }
    }

    // Test 4: Check RLS policies
    console.log('\n🛡️ Test 4: Checking RLS status...');
    
    // This requires service role, so we'll just note it
    console.log('ℹ️ RLS policies can only be checked with service role key');
    console.log('ℹ️ Check your Supabase dashboard → Authentication → RLS');

  } catch (error) {
    console.error('❌ Diagnostics failed:', error.message);
  }
}

// Test database connection first
async function testConnection() {
  try {
    console.log('🔗 Testing database connection...');
    const { data, error } = await supabase.from('user_profiles').select('count').single();
    
    if (error && error.message.includes('relation "user_profiles" does not exist')) {
      console.log('❌ Database tables not found! You need to run the schema.sql');
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.log('❌ Connection failed:', err.message);
    return false;
  }
}

async function main() {
  const connected = await testConnection();
  if (connected) {
    await diagnostics();
  } else {
    console.log('\n🔧 SOLUTION: You need to set up your database schema!');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of sql/schema.sql');
    console.log('4. Run the SQL script');
    console.log('5. Then run this diagnostic again');
  }
}

main();