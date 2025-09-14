/**
 * Testing Dashboard Component
 * Interactive dashboard for running and viewing test results
 */

import React, { useState, useEffect } from 'react';
import './TestingDashboard.css';

const TestingDashboard = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('device');
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Initialize testing suite on mount
  useEffect(() => {
    const initTestingTools = async () => {
      try {
        // Import testing modules dynamically
        const testingSuiteModule = await import('../../utils/testingSuite');
        const compatibilityModule = await import('../../utils/compatibilityValidator');
        
        // Initialize testing tools
        testingSuiteModule.initTestingSuite();
        compatibilityModule.initValidationSuite();
        
        console.log('🧪 Testing dashboard ready');
      } catch (error) {
        console.error('Failed to initialize testing tools:', error);
      }
    };

    initTestingTools();
  }, []);

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    
    try {
      const results = {};
      
      // Device testing (25% progress)
      setProgress(25);
      if (window.testingSuite) {
        results.devices = await window.testingSuite.deviceTesting.startDeviceTesting();
      }
      
      // Performance audit (50% progress)
      setProgress(50);
      if (window.testingSuite) {
        results.performance = await window.testingSuite.performanceAudit.runPerformanceAudit();
      }
      
      // Compatibility validation (75% progress)
      setProgress(75);
      if (window.validationSuite) {
        results.compatibility = await window.validationSuite.runAllValidations();
      }
      
      // Complete (100% progress)
      setProgress(100);
      setTestResults(results);
      
      console.log('🎉 All tests completed successfully');
      
    } catch (error) {
      console.error('Testing failed:', error);
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  // Run device-specific tests
  const runDeviceTests = async () => {
    setIsRunning(true);
    
    try {
      if (window.testingSuite) {
        const results = await window.testingSuite.testCurrentDevice();
        setTestResults(prev => ({ ...prev, currentDevice: results }));
      }
    } catch (error) {
      console.error('Device testing failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Run performance audit
  const runPerformanceAudit = async () => {
    setIsRunning(true);
    
    try {
      if (window.testingSuite) {
        const results = await window.testingSuite.performanceAudit.runPerformanceAudit();
        setTestResults(prev => ({ ...prev, performance: results }));
      }
    } catch (error) {
      console.error('Performance audit failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Run compatibility validation
  const runCompatibilityValidation = async () => {
    setIsRunning(true);
    
    try {
      if (window.validationSuite) {
        const results = await window.validationSuite.runAllValidations();
        setTestResults(prev => ({ ...prev, compatibility: results }));
      }
    } catch (error) {
      console.error('Compatibility validation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  // Toggle dashboard visibility
  const toggleDashboard = () => {
    setIsVisible(!isVisible);
  };

  // Render test status
  const renderTestStatus = (status) => {
    const icons = {
      'PASS': '✅',
      'PARTIAL': '⚠️',
      'FAIL': '❌',
      'SKIP': '⏭️'
    };
    
    return (
      <span className={`test-status test-status-${status?.toLowerCase()}`}>
        {icons[status] || '❓'} {status || 'UNKNOWN'}
      </span>
    );
  };

  // Render device test results
  const renderDeviceResults = () => {
    if (!testResults.devices && !testResults.currentDevice) {
      return <div className="no-results">No device test results available</div>;
    }

    const deviceData = testResults.currentDevice || testResults.devices;
    
    return (
      <div className="test-section">
        <h3>📱 Device Testing Results</h3>
        
        {testResults.currentDevice && (
          <div className="device-result">
            <h4>{testResults.currentDevice.device}</h4>
            <div className="test-grid">
              {Object.entries(testResults.currentDevice.tests || {}).map(([testName, result]) => (
                <div key={testName} className="test-item">
                  <span className="test-name">{testName}</span>
                  {renderTestStatus(result.status)}
                  {result.score && <span className="test-score">{result.score}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {testResults.devices && Object.entries(testResults.devices).map(([deviceId, result]) => (
          <div key={deviceId} className="device-result">
            <h4>{result.device}</h4>
            <div className="test-grid">
              {Object.entries(result.tests || {}).map(([testName, testResult]) => (
                <div key={testName} className="test-item">
                  <span className="test-name">{testName}</span>
                  {renderTestStatus(testResult.status)}
                  {testResult.score && <span className="test-score">{testResult.score}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render performance results
  const renderPerformanceResults = () => {
    if (!testResults.performance) {
      return <div className="no-results">No performance test results available</div>;
    }

    const { metrics, recommendations } = testResults.performance;
    
    return (
      <div className="test-section">
        <h3>⚡ Performance Audit Results</h3>
        
        {metrics.coreWebVitals && (
          <div className="metrics-group">
            <h4>Core Web Vitals</h4>
            <div className="vitals-grid">
              {metrics.coreWebVitals.lcp && (
                <div className="vital-item">
                  <span className="vital-name">LCP</span>
                  <span className="vital-value">{metrics.coreWebVitals.lcp}ms</span>
                  <span className={`vital-status ${metrics.coreWebVitals.lcp < 2500 ? 'good' : 'needs-improvement'}`}>
                    {metrics.coreWebVitals.lcp < 2500 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              )}
              
              {metrics.coreWebVitals.fid && (
                <div className="vital-item">
                  <span className="vital-name">FID</span>
                  <span className="vital-value">{metrics.coreWebVitals.fid}ms</span>
                  <span className={`vital-status ${metrics.coreWebVitals.fid < 100 ? 'good' : 'needs-improvement'}`}>
                    {metrics.coreWebVitals.fid < 100 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              )}
              
              {metrics.coreWebVitals.cls && (
                <div className="vital-item">
                  <span className="vital-name">CLS</span>
                  <span className="vital-value">{metrics.coreWebVitals.cls}</span>
                  <span className={`vital-status ${metrics.coreWebVitals.cls < 0.1 ? 'good' : 'needs-improvement'}`}>
                    {metrics.coreWebVitals.cls < 0.1 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {metrics.memory && (
          <div className="metrics-group">
            <h4>Memory Usage</h4>
            <div className="memory-info">
              <div className="memory-bar">
                <div 
                  className="memory-used" 
                  style={{ width: `${Math.min(metrics.memory.percentage, 100)}%` }}
                ></div>
              </div>
              <span className="memory-text">
                {metrics.memory.percentage?.toFixed(1)}% used
              </span>
            </div>
          </div>
        )}
        
        {recommendations && recommendations.length > 0 && (
          <div className="recommendations">
            <h4>💡 Recommendations</h4>
            <ul>
              {recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Render compatibility results
  const renderCompatibilityResults = () => {
    if (!testResults.compatibility) {
      return <div className="no-results">No compatibility test results available</div>;
    }

    return (
      <div className="test-section">
        <h3>🔍 Compatibility Validation Results</h3>
        
        {Object.entries(testResults.compatibility).map(([platform, result]) => (
          <div key={platform} className="platform-result">
            <h4>{platform.toUpperCase()} Compatibility</h4>
            
            {result.isCompatible !== undefined && (
              <div className="compatibility-status">
                {result.isCompatible ? '✅ Compatible' : '❌ Incompatible'}
              </div>
            )}
            
            {result.features && (
              <div className="feature-matrix">
                {Object.entries(result.features).map(([category, features]) => (
                  <div key={category} className="feature-category">
                    <h5>{category}</h5>
                    <div className="feature-list">
                      {Object.entries(features).map(([feature, supported]) => (
                        <div key={feature} className="feature-item">
                          <span className="feature-name">{feature}</span>
                          {typeof supported === 'boolean' ? (
                            renderTestStatus(supported ? 'PASS' : 'FAIL')
                          ) : (
                            <span className="feature-complex">{JSON.stringify(supported)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {result.warnings && result.warnings.length > 0 && (
              <div className="warnings">
                <h5>⚠️ Warnings</h5>
                <ul>
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {result.score !== undefined && (
              <div className="accessibility-score">
                <span>Accessibility Score: {result.score}/100</span>
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${result.score}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  if (!isVisible) {
    return (
      <button 
        className="testing-dashboard-trigger"
        onClick={toggleDashboard}
        title="Open Testing Dashboard"
      >
        🧪
      </button>
    );
  }

  return (
    <div className="testing-dashboard">
      <div className="dashboard-header">
        <h2>🧪 Testing Dashboard</h2>
        <button 
          className="close-button"
          onClick={toggleDashboard}
        >
          ✕
        </button>
      </div>
      
      {isRunning && (
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="progress-text">Running tests... {progress}%</span>
        </div>
      )}
      
      <div className="dashboard-controls">
        <button 
          className="test-button primary"
          onClick={runAllTests}
          disabled={isRunning}
        >
          🚀 Run All Tests
        </button>
        
        <div className="individual-tests">
          <button 
            className="test-button"
            onClick={runDeviceTests}
            disabled={isRunning}
          >
            📱 Device Tests
          </button>
          
          <button 
            className="test-button"
            onClick={runPerformanceAudit}
            disabled={isRunning}
          >
            ⚡ Performance Audit
          </button>
          
          <button 
            className="test-button"
            onClick={runCompatibilityValidation}
            disabled={isRunning}
          >
            🔍 Compatibility Check
          </button>
        </div>
      </div>
      
      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'device' ? 'active' : ''}`}
          onClick={() => setActiveTab('device')}
        >
          📱 Device Tests
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          ⚡ Performance
        </button>
        
        <button 
          className={`tab-button ${activeTab === 'compatibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('compatibility')}
        >
          🔍 Compatibility
        </button>
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'device' && renderDeviceResults()}
        {activeTab === 'performance' && renderPerformanceResults()}
        {activeTab === 'compatibility' && renderCompatibilityResults()}
      </div>
    </div>
  );
};

export default TestingDashboard;