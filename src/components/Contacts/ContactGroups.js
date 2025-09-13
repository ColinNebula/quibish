import React from 'react';
import './ContactGroups.css';

const ContactGroups = ({ categories, selectedCategory, onCategoryChange }) => {
  return (
    <div className="contact-groups">
      <div className="groups-container">
        {categories.map(category => (
          <button
            key={category.id}
            className={`group-btn ${selectedCategory === category.id ? 'active' : ''}`}
            onClick={() => onCategoryChange(category.id)}
            title={`${category.label} (${category.count})`}
          >
            <span className="group-icon">{category.icon}</span>
            <span className="group-label">{category.label}</span>
            <span className="group-count">{category.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ContactGroups;