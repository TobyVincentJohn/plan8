/*
  # Disable RLS on travel_groups, group_members, and profiles tables
  This will allow unrestricted access to these tables.
*/

ALTER TABLE travel_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop policies for travel_groups
DROP POLICY IF EXISTS "Users can create travel groups" ON travel_groups;
DROP POLICY IF EXISTS "Allow all authenticated to create travel groups" ON travel_groups;
DROP POLICY IF EXISTS "Users can read groups they are members of" ON travel_groups;
DROP POLICY IF EXISTS "Hosts can update their travel groups" ON travel_groups;
DROP POLICY IF EXISTS "Hosts can delete their travel groups" ON travel_groups;

-- Drop policies for group_members
DROP POLICY IF EXISTS "Users can read group members of groups they belong to" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can update their own group membership" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "Allow all authenticated to read group_members" ON group_members;

-- Drop policies for profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles; 