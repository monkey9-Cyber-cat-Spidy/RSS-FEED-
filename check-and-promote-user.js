import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uwcoyeeyrvzhueghtknm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3Y295ZWV5cnZ6aHVlZ2h0a25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzgzMzcsImV4cCI6MjA3NDU1NDMzN30.5EsKiweOlxJ4TRLLXeQrEhPcEVlFvaYEXFk5t4VPfZM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  console.log('🔍 Checking user roles and permissions...\n');

  try {
    // Get all users
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Error fetching users:', error.message);
      return;
    }

    console.log('👥 Current Users:');
    users.forEach((user, index) => {
      const roleIcon = user.role === 'admin' ? '👑' : '👤';
      console.log(`${index + 1}. ${roleIcon} ${user.display_name} (${user.email}) - Role: ${user.role}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });

    // Check if mk1343093@gmail.com exists and their role
    const targetUser = users.find(user => user.email === 'mk1343093@gmail.com');
    
    if (targetUser) {
      console.log('🎯 Target User Found:');
      console.log(`Email: ${targetUser.email}`);
      console.log(`Role: ${targetUser.role}`);
      console.log(`ID: ${targetUser.id}`);
      
      if (targetUser.role !== 'admin') {
        console.log('\n⚠️  User is not an admin! They need admin role to create articles.');
        console.log('📝 To fix this, you need to run the SQL command to promote them.');
        console.log(`\n🔧 SQL Command to promote user:`);
        console.log(`UPDATE user_profiles SET role = 'admin' WHERE email = 'mk1343093@gmail.com';`);
      } else {
        console.log('\n✅ User is already an admin!');
        console.log('The issue might be missing article creation interface.');
      }
    } else {
      console.log('❌ User mk1343093@gmail.com not found in database!');
    }

    // Check articles
    console.log('\n📰 Current Articles:');
    const { data: articles, error: articlesError } = await supabase
      .from('articles')
      .select(`
        *,
        user_profiles (display_name, email, role)
      `)
      .order('published_at', { ascending: false });

    if (articlesError) {
      console.log('❌ Error fetching articles:', articlesError.message);
    } else {
      if (articles.length === 0) {
        console.log('📝 No articles found. This explains why the page is empty!');
      } else {
        articles.forEach((article, index) => {
          const author = article.user_profiles;
          console.log(`${index + 1}. "${article.title}" by ${author?.display_name} (${author?.email})`);
          console.log(`   Status: ${article.is_published ? 'Published' : 'Draft'}`);
          console.log(`   Date: ${new Date(article.published_at).toLocaleDateString()}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUser();