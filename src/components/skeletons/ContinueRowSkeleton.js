import React from 'react';
import './ContinueRowSkeleton.css'; // Optional: Add styles for skeleton

const ContinueRowSkeleton = () => {
    return (
        <div className="continue-row-skeleton">
            <div className="skeleton-thumbnail"></div>
            <div className="skeleton-content">
                <div className="skeleton-title"></div>
                <div className="skeleton-subtitle"></div>
            </div>
        </div>
    );
};

export default ContinueRowSkeleton;