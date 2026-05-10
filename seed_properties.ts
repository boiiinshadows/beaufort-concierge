import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const properties = [
  {
    id: 'ambassador-row',
    name: 'Ambassador Row',
    location: 'Ridge',
    price_min: 550000,
    property_type: 'townhouse',
    bedrooms: 4,
    description: '9 exclusive townhouses. Premium location.',
  },
  {
    id: 'pinewood-place',
    name: 'Pinewood Place',
    location: 'Airport Residential',
    price_min: 98000,
    property_type: 'apartment',
    bedrooms: 1,
    description: 'Modern contemporary apartments.',
  },
  {
    id: 'trinity-riviera',
    name: 'Trinity @ Riviera',
    location: 'East Legon',
    price_min: 91000,
    property_type: 'apartment',
    bedrooms: 1,
    description: 'Lakeside apartments. Very popular with investors.',
  },
  {
    id: 'riviera-residence',
    name: 'Riviera Residence',
    location: 'East Legon',
    price_min: 150000,
    property_type: 'mixed-use',
    bedrooms: 2,
    description: 'Waterfront mixed-use. Selected units available.',
  },
  {
    id: 'beaufort-ridge',
    name: 'Beaufort Ridge',
    location: 'Ridge',
    price_min: 200000,
    property_type: 'apartment',
    bedrooms: 2,
    description: 'Luxury apartments. Newly released units available.',
  }
];

async function seed() {
  console.log('Seeding properties...');
  const { error } = await supabase.from('properties').upsert(properties);
  if (error) {
    console.error('Error seeding properties:', error);
  } else {
    console.log('Properties seeded successfully.');
  }
}

seed();
