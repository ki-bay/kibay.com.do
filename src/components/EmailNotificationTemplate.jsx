// Note: This component serves as a visual reference and template source.
// The actual HTML string is constructed in the Edge Function for email sending.
import React from 'react';

const EmailNotificationTemplate = ({ 
  postTitle = "Discover the Taste of Kibay",
  postDescription = "Experience the refreshing blend of premium sparkling wine and natural tropical flavors.",
  featuredImageUrl = "https://example.com/kibay-hero.jpg",
  postUrl = "#",
  unsubscribeUrl = "#"
}) => {
  // Styles inline for email compatibility
  const styles = {
    body: { fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", backgroundColor: "#f8fafc", margin: 0, padding: 0, color: "#334155" },
    container: { maxWidth: "600px", margin: "20px auto", backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" },
    header: { backgroundColor: "#0f172a", padding: "20px", textAlign: "center" },
    headerText: { color: "#ffffff", margin: 0, fontSize: "24px", letterSpacing: "1px", fontWeight: "bold" },
    heroImage: { width: "100%", height: "250px", objectFit: "cover", backgroundColor: "#e2e8f0", display: "block" },
    content: { padding: "32px" },
    tag: { color: "#f59e0b", textTransform: "uppercase", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px", marginBottom: "8px", display: "block" },
    title: { margin: "0 0 16px", fontSize: "28px", lineHeight: "1.2", color: "#0f172a", fontWeight: "bold" },
    description: { fontSize: "16px", lineHeight: "1.6", color: "#475569", marginBottom: "24px" },
    button: { display: "inline-block", backgroundColor: "#f59e0b", color: "#ffffff", textDecoration: "none", padding: "14px 28px", borderRadius: "6px", fontWeight: "bold", textAlign: "center" },
    footer: { backgroundColor: "#f1f5f9", padding: "24px", textAlign: "center", fontSize: "12px", color: "#94a3b8" },
    link: { color: "#94a3b8", textDecoration: "underline" }
  };

  return (
    <div style={styles.body}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.headerText}>Ki-BAY</h1>
        </div>
        
        {featuredImageUrl && (
          <img src={featuredImageUrl} alt={postTitle} style={styles.heroImage} />
        )}
        
        <div style={styles.content}>
          <span style={styles.tag}>New Story</span>
          <h2 style={styles.title}>{postTitle}</h2>
          <p style={styles.description}>{postDescription}</p>
          <a href={postUrl} style={styles.button}>Read Full Story</a>
        </div>
        
        <div style={styles.footer}>
          <p style={{margin: "0 0 8px"}}>&copy; {new Date().getFullYear()} Kibay Espumante. All rights reserved.</p>
          <p style={{margin: "0 0 8px"}}>You received this email because you subscribed to our newsletter.</p>
          <a href={unsubscribeUrl} style={styles.link}>Unsubscribe</a>
        </div>
      </div>
    </div>
  );
};

export default EmailNotificationTemplate;