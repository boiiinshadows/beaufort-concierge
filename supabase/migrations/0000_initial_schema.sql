CREATE TYPE user_status AS ENUM ('new', 'qualified', 'viewing_scheduled', 'closed_won', 'closed_lost');
CREATE TYPE buyer_classification AS ENUM ('investor', 'owner-occupant', 'undecided');

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  location_preference TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  property_type_preference TEXT,
  status user_status DEFAULT 'new',
  buyer_type buyer_classification,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  property_id TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending',
  calendar_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  price_min INTEGER,
  price_max INTEGER,
  property_type TEXT,
  bedrooms INTEGER,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'available',
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
