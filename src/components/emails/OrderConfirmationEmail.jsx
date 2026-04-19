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
  orderInfo: {
    backgroundColor: '#f5f5f4',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px',
  },
  th: {
    textAlign: 'left',
    borderBottom: '2px solid #eaeaea',
    padding: '10px 0',
    color: '#1c1917',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  td: {
    borderBottom: '1px solid #eaeaea',
    padding: '15px 0',
    color: '#555555',
    verticalAlign: 'top',
  },
  priceTd: {
    borderBottom: '1px solid #eaeaea',
    padding: '15px 0',
    color: '#555555',
    textAlign: 'right',
    verticalAlign: 'top',
  },
  totalRow: {
    borderTop: '2px solid #1c1917',
  },
  totalLabel: {
    padding: '15px 0',
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#1c1917',
  },
  totalValue: {
    padding: '15px 0',
    textAlign: 'right',
    fontWeight: 'bold',
    color: '#D4A574',
    fontSize: '18px',
  },
  button: {
    backgroundColor: '#D4A574',
    color: '#ffffff',
    padding: '14px 28px',
    textDecoration: 'none',
    borderRadius: '4px',
    fontWeight: 'bold',
    display: 'inline-block',
    margin: '20px 0',
    textAlign: 'center',
  },
  center: {
    textAlign: 'center',
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

const OrderConfirmationEmail = ({ orderData, customerName }) => {
  const { id, date, items, subtotal, tax, shipping, total } = orderData;
  const formattedDate = date ? new Date(date).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <EmailTemplate>
      <h1 style={styles.h1}>Order Confirmed</h1>
      <p style={styles.p}>Hello {customerName},</p>
      <p style={styles.p}>
        Thank you for your order! We're excited to let you know that we've received your order and are preparing it for shipment.
      </p>

      <div style={styles.orderInfo}>
        <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Order Number:</strong> #{id}</p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}><strong>Order Date:</strong> {formattedDate}</p>
      </div>

      <h2 style={{ fontSize: '18px', color: '#1c1917', marginBottom: '15px' }}>Order Summary</h2>
      
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Item</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Qty</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {items && items.map((item, index) => (
            <tr key={index}>
              <td style={styles.td}>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{item.title}</div>
                {item.variant && <div style={{ fontSize: '12px', color: '#888' }}>{item.variant}</div>}
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>{item.quantity}</td>
              <td style={styles.priceTd}>${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="2" style={{ ...styles.td, textAlign: 'right', fontWeight: 'bold' }}>Subtotal</td>
            <td style={styles.priceTd}>${subtotal.toFixed(2)}</td>
          </tr>
          {shipping > 0 && (
            <tr>
              <td colSpan="2" style={{ ...styles.td, textAlign: 'right' }}>Shipping</td>
              <td style={styles.priceTd}>${shipping.toFixed(2)}</td>
            </tr>
          )}
          {tax > 0 && (
            <tr>
              <td colSpan="2" style={{ ...styles.td, textAlign: 'right' }}>Tax</td>
              <td style={styles.priceTd}>${tax.toFixed(2)}</td>
            </tr>
          )}
          <tr style={styles.totalRow}>
            <td colSpan="2" style={styles.totalLabel}>Total</td>
            <td style={styles.totalValue}>${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div style={styles.center}>
        <a href={`https://kibay.com.do/account`} style={styles.button}>
          View Your Order
        </a>
      </div>

      <p style={styles.helpText}>
        If you have any questions about your order, contact us at <a href="mailto:orders@kibay.com.do" style={{ color: '#D4A574' }}>orders@kibay.com.do</a> or visit <a href="https://kibay.com.do/" style={{ color: '#D4A574' }}>kibay.com.do</a>.
      </p>
    </EmailTemplate>
  );
};

export default OrderConfirmationEmail;