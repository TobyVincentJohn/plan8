import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Test 1: Check environment variables
    console.log('🔍 Environment check:');
    console.log('   SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
    console.log('   SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
    
    // Test 2: Simple query
    console.log('🔍 Testing simple query...');
    const { data, error, count } = await supabase
      .from('travel_groups')
      .select('group_id, destination')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: 'Supabase query failed',
        details: error,
        environment: {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
          supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        }
      });
    }
    
    console.log('✅ Supabase connection successful');
    console.log('✅ Query result:', { data, count });
    
    return NextResponse.json({
      success: true,
      message: 'Supabase connection working',
      queryResult: { data, count },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      }
    });
    
  } catch (error) {
    console.error('❌ Unexpected error testing Supabase:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      }
    });
  }
}