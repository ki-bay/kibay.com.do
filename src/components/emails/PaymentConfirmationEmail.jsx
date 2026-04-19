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
  highlightBox: {
    backgroundColor: '#ecfdf5',
    border: '1px solid #10b981',
    color: '#065f46',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
    textAlign: 'center',
  },
  detailsBox: {
    backgroundColor: '#f5f5f4',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #e7e5e4',
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#1c1917',
  },
  detailValue: {
    color: '#555555',
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

const PaymentConfirmationEmail = ({ orderData, paymentData, customerName }) => {
  const { id, total } = orderData;
  const { transactionId, paymentMethod, date } = paymentData;

  return (
    <EmailTemplate>
      <h1 style={styles.h1}>Payment Received</h1>
      
      <div style={styles.highlightBox}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>Thank you! Your payment was successful.</p>
      </div>

      <p style={styles.p}>Hello {customerName},</p>
      <p style={styles.p}>
        We have received your payment for order <strong>#{id}</strong>. A receipt is provided below for your records.
      </p>

      <div style={styles.detailsBox}>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Amount Paid:</span>
          <span style={{ ...styles.detailValue, fontSize: '18px', fontWeight: 'bold', color: '#D4A574' }}>
            ${total.toFixed(2)}
          </span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Transaction ID:</span>
          <span style={styles.detailValue}>{transactionId}</span>
        </div>
        <div style={styles.detailRow}>
          <span style={styles.detailLabel}>Payment Method:</span>
          <span style={styles.detailValue}>{paymentMethod}</span>
        </div>
        <div style={{ ...styles.detailRow, borderBottom: 'none' }}>
          <span style={styles.detailLabel}>Date:</span>
          <span style={styles.detailValue}>{new Date(date).toLocaleDateString()}</span>
        </div>
      </div>

      <p style={styles.helpText}>
        If you have any questions about this payment, please contact us at <a href="mailto:orders@kibay.com.do" style={{ color: '#D4A574' }}>orders@kibay.com.do</a>.
      </p>
    </EmailTemplate>
  );
};

export default PaymentConfirmationEmail;