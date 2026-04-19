import React from 'react';
import EmailTemplate from './EmailTemplate';

const styles = {
  h1: {
    color: '#dc2626',
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
  infoBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  refundText: {
    fontWeight: 'bold',
    color: '#1c1917',
    marginTop: '20px',
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

const OrderCancellationEmail = ({ orderData, cancellationData, customerName }) => {
  const { id } = orderData;
  const { reason, refundAmount } = cancellationData;

  return (
    <EmailTemplate>
      <h1 style={styles.h1}>Order Cancelled</h1>
      
      <p style={styles.p}>Hello {customerName},</p>
      <p style={styles.p}>
        Your order <strong>#{id}</strong> has been cancelled as requested.
      </p>

      <div style={styles.infoBox}>
        {reason && (
          <p style={{ margin: '0 0 10px 0' }}>
            <strong>Reason for cancellation:</strong><br/>
            {reason}
          </p>
        )}
        
        {refundAmount > 0 && (
          <p style={{ margin: '15px 0 0 0', color: '#dc2626' }}>
            A refund of <strong>${refundAmount.toFixed(2)}</strong> has been initiated to your original payment method. Please allow 5-10 business days for it to appear on your statement.
          </p>
        )}
      </div>

      <p style={styles.p}>
        We hope to have the opportunity to serve you again in the future.
      </p>

      <p style={styles.helpText}>
        If this cancellation was a mistake or you have questions, please contact us immediately at <a href="mailto:orders@kibay.com.do" style={{ color: '#D4A574' }}>orders@kibay.com.do</a>.
      </p>
    </EmailTemplate>
  );
};

export default OrderCancellationEmail;