import React from 'react';
import EmailTemplate from './EmailTemplate';

const styles = {
  h1: {
    color: '#1c1917',
    fontSize: '24px',
    fontWeight: '300',
    margin: '0 0 20px 0',
    textAlign: 'center',
  },
  p: {
    color: '#555555',
    fontSize: '16px',
    margin: '0 0 20px 0',
  },
  trackingBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #3b82f6',
    padding: '25px',
    borderRadius: '8px',
    marginBottom: '30px',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#D4A574',
    color: '#ffffff',
    padding: '14px 28px',
    textDecoration: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    display: 'inline-block',
    margin: '15px 0',
  },
  itemsBox: {
    marginTop: '30px',
  },
  itemRow: {
    padding: '10px 0',
    borderBottom: '1px solid #eaeaea',
    display: 'flex',
    justifyContent: 'space-between',
  },
  helpText: {
    fontSize: '14px',
    color: '#888888',
    marginTop: '30px',
    textAlign: 'center',
    borderTop: '1px solid #eaeaea',
    paddingTop: '20px',
  }
};

const ShippingNotificationEmail = ({ orderData, shippingData, customerName }) => {
  const { id, items } = orderData;
  const { trackingNumber, carrier, trackingUrl, estimatedDelivery } = shippingData;

  return (
    <EmailTemplate>
      <h1 style={styles.h1}>Your Order is on the Way!</h1>
      
      <p style={styles.p}>Great news, {customerName}!</p>
      <p style={styles.p}>
        The items from order <strong>#{id}</strong> have been shipped and are making their way to you.
      </p>

      <div style={styles.trackingBox}>
        <p style={{ margin: '0 0 10px 0', color: '#1e40af', fontWeight: 'bold' }}>Tracking Number: {trackingNumber}</p>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#60a5fa' }}>Carrier: {carrier}</p>
        
        {trackingUrl && (
          <a href={trackingUrl} style={styles.button}>
            Track Your Package
          </a>
        )}
        
        {estimatedDelivery && (
          <p style={{ margin: '15px 0 0 0', fontSize: '14px', color: '#1e40af' }}>
            Estimated Delivery: {new Date(estimatedDelivery).toLocaleDateString()}
          </p>
        )}
      </div>

      <div style={styles.itemsBox}>
        <h3 style={{ borderBottom: '2px solid #eaeaea', paddingBottom: '10px', color: '#1c1917' }}>Items in this Shipment</h3>
        {items && items.map((item, index) => (
          <div key={index} style={styles.itemRow}>
            <span style={{ color: '#333' }}>{item.quantity}x {item.title}</span>
            <span style={{ color: '#888' }}>{item.variant}</span>
          </div>
        ))}
      </div>

      <p style={styles.helpText}>
        If you have any questions about your delivery, contact us at <a href="mailto:orders@kibay.com.do" style={{ color: '#D4A574' }}>orders@kibay.com.do</a>.
      </p>
    </EmailTemplate>
  );
};

export default ShippingNotificationEmail;