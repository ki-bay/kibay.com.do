import React from 'react';
import ReactDOMServer from 'react-dom/server';
import OrderConfirmationEmail from '@/components/emails/OrderConfirmationEmail';
import PaymentConfirmationEmail from '@/components/emails/PaymentConfirmationEmail';
import ShippingNotificationEmail from '@/components/emails/ShippingNotificationEmail';
import OrderCancellationEmail from '@/components/emails/OrderCancellationEmail';

export const renderEmailHtml = (emailType, data) => {
  let component;

  switch (emailType) {
    case 'order_confirmation':
      component = <OrderConfirmationEmail {...data} />;
      break;
    case 'payment_confirmation':
      component = <PaymentConfirmationEmail {...data} />;
      break;
    case 'shipping_notification':
      component = <ShippingNotificationEmail {...data} />;
      break;
    case 'order_cancellation':
      component = <OrderCancellationEmail {...data} />;
      break;
    default:
      console.warn(`Unknown email type: ${emailType}`);
      return '';
  }

  const htmlContent = ReactDOMServer.renderToStaticMarkup(component);

  // Wrap in basic HTML structure for email clients
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kibay Notification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f4;">
        ${htmlContent}
      </body>
    </html>
  `;
};