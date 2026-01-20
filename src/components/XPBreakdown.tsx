import React from 'react';
import type { XPResult } from '../types';

interface Props {
    result: XPResult;
}

const XPBreakdown: React.FC<Props> = ({ result }) => {
    // SAFE MODE: XP System Disabled
    if (!result) return null;

    return (
        <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 text-white shadow-lg">
            <div className="text-gray-400 text-sm">XP System Disabled</div>
        </div>
    );
};

export default XPBreakdown;
