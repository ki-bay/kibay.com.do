import React from 'react';
import { mediaUrl } from '@/config/mediaCdn';

const styles = {
  container: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    color: '#333333',
    lineHeight: '1.6',
  },
  header: {
    padding: '30px 20px',
    textAlign: 'center',
    borderBottom: '1px solid #eaeaea',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: '180px',
    height: 'auto',
    display: 'block',
    margin: '0 auto',
  },
  body: {
    padding: '40px 20px',
    backgroundColor: '#ffffff',
  },
  footer: {
    backgroundColor: '#f9f9f9',
    padding: '30px 20px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#888888',
    borderTop: '1px solid #eaeaea',
  },
  footerLink: {
    color: '#D4A574',
    textDecoration: 'none',
    margin: '0 5px',
  },
  divider: {
    margin: '0 5px',
    color: '#cccccc',
  }
};

const EmailTemplate = ({ children }) => {
  return (
    <div style={styles.container}>
      {/* Header with Kibay Logo */}
      <div style={styles.header}>
        <img 
          src={mediaUrl('e711380acfce17f0bc86832982651aea.png')} 
          alt="Kibay" 
          style={styles.logo}
        />
      </div>

      {/* Main Content */}
      <div style={styles.body}>
        {children}
      </div>

      {/* Professional Footer */}
      <div style={styles.footer}>
        <p style={{ margin: '0 0 10px 0' }}>
          &copy; {new Date().getFullYear()} Kibay. All rights reserved.
        </p>
        <p style={{ margin: '0' }}>
          Kibay
          <span style={styles.divider}>|</span>
          <a href="https://kibay.com.do/" style={styles.footerLink}>kibay.com.do</a>
          <span style={styles.divider}>|</span>
          <a href="mailto:orders@kibay.com.do" style={styles.footerLink}>orders@kibay.com.do</a>
        </p>
      </div>
    </div>
  );
};

export default EmailTemplate;