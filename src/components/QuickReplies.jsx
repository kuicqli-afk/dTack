// frontend/src/components/QuickReplies.jsx
import React from 'react';
import './QuickReplies.css';

const QuickReplies = ({ onSend, disabled }) => {
  const replies = [
    { label: '📦 Order Status', value: 'Order status' },
    { label: '🔍 Search Product', value: 'Search product' },
    { label: '📸 Scan Barcode', value: 'Barcode scan' },
    { label: '🔄 Return Policy', value: 'Return policy' },
    { label: '💰 Offers', value: 'Offers' },
    { label: '📞 Support', value: 'Contact support' }
  ];

  return (
    <div className="quick-replies">
      {replies.map((reply, index) => (
        <button
          key={index}
          className="quick-reply-btn"
          onClick={() => onSend(reply.value)}
          disabled={disabled}
        >
          {reply.label}
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;