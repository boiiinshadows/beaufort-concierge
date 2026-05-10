'use client';

import { useEffect, useState } from 'react';
import styles from './admin.module.css';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  location_preference: string | null;
  property_type_preference: string | null;
  status: string;
  created_at: string;
}

interface Booking {
  id: string;
  lead_id: string;
  property_id: string;
  scheduled_at: string;
  status: string;
  created_at: string;
  leads?: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  };
  properties?: {
    name: string;
    location: string;
  };
}

export default function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsRes, bookingsRes] = await Promise.all([
          fetch('/api/leads'),
          fetch('/api/bookings')
        ]);
        
        const leadsData = await leadsRes.json();
        const bookingsData = await bookingsRes.json();
        
        if (leadsData.leads) setLeads(leadsData.leads);
        if (bookingsData.bookings) setBookings(bookingsData.bookings);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading Dashboard Data...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Concierge Admin Dashboard</h1>
        <p className={styles.subtitle}>Overview of recent leads and property viewings</p>
      </header>

      <div className={styles.dashboard}>
        {/* Bookings Card */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Upcoming Viewings
            <span className={styles.badge}>{bookings.length}</span>
          </div>
          
          <div className={styles.list}>
            {bookings.length === 0 ? (
              <div className={styles.emptyState}>No viewings scheduled yet.</div>
            ) : (
              bookings.map((booking) => {
                const date = new Date(booking.scheduled_at);
                const isPending = booking.status === 'pending';
                return (
                  <div key={booking.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemName}>
                        {booking.properties?.name || 'Unknown Property'}
                      </span>
                      <span className={`${styles.statusBadge} ${isPending ? styles.statusPending : styles.statusConfirmed}`}>
                        {booking.status}
                      </span>
                    </div>
                    
                    <div className={styles.itemDetail}>
                      🗓️ {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className={styles.itemDetail}>
                      👤 {booking.leads?.first_name || 'Guest'} {booking.leads?.last_name || 'User'}
                    </div>
                    <div className={styles.itemDetail}>
                      ✉️ {booking.leads?.email || 'No email provided'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Leads Card */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            Recent Leads
            <span className={styles.badge}>{leads.length}</span>
          </div>
          
          <div className={styles.list}>
            {leads.length === 0 ? (
              <div className={styles.emptyState}>No leads captured yet.</div>
            ) : (
              leads.map((lead) => {
                const date = new Date(lead.created_at);
                return (
                  <div key={lead.id} className={styles.listItem}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemName}>
                        {lead.first_name || 'Guest'} {lead.last_name || 'User'}
                      </span>
                      <span className={styles.itemDate}>
                        {date.toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className={styles.itemDetail}>
                      ✉️ {lead.email}
                    </div>
                    {(lead.budget_min || lead.budget_max) && (
                      <div className={styles.itemDetail}>
                        💰 Budget: {lead.budget_min ? `$${lead.budget_min.toLocaleString()}` : '$0'} - {lead.budget_max ? `$${lead.budget_max.toLocaleString()}` : 'Any'}
                      </div>
                    )}
                    {lead.property_type_preference && (
                      <div className={styles.itemDetail}>
                        🏠 Interested in: <span style={{textTransform: 'capitalize'}}>{lead.property_type_preference}</span> 
                        {lead.location_preference && ` in ${lead.location_preference}`}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
