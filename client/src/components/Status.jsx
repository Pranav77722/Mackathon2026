import React from 'react';

const Status = ({ status }) => {
    if (!status) return null;

    const { successCount, failureCount, errors } = status;

    return (
        <div className="max-w-xl mx-auto mb-8">
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 font-medium mb-1">Generated Successfully</div>
                    <div className="text-2xl font-bold text-green-700">{successCount}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-sm text-red-600 font-medium mb-1">Failed</div>
                    <div className="text-2xl font-bold text-red-700">{failureCount}</div>
                </div>
            </div>

            {errors && errors.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Error Log</h4>
                    <div className="space-y-2">
                        {errors.map((err, idx) => (
                            <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                                <span className="font-medium text-gray-700">{err.name}</span>
                                <span className="text-red-500">{err.error}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Status;
