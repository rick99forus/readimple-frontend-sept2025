// Run this in your browser console to test API connection

const testAPI = async () => {
  try {
    console.log('🧪 Testing API connection...');
    
    // Test 1: Basic health check
    const healthResponse = await fetch('http://localhost:5001/');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Books test endpoint
    const testResponse = await fetch('http://localhost:5001/api/books/test');
    const testData = await testResponse.json();
    console.log('✅ Books test:', testData);
    
    // Test 3: Hero slideshow (what HeroSlideshow needs)
    const heroResponse = await fetch('http://localhost:5001/api/books/hero-slideshow');
    const heroData = await heroResponse.json();
    console.log('✅ Hero slideshow:', heroData);
    
    console.log('🎉 All tests passed! Your API is working.');
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error);
    console.log('🔍 Check that your backend is running on http://localhost:5001');
    return false;
  }
};

// Run the test
testAPI();