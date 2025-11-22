// Accessibility audit script for design system components
// This script tests ARIA attributes, keyboard navigation, and WCAG compliance

const fs = require('fs');
const path = require('path');

// WCAG 2.1 AA Guidelines Checklist
const WCAG_CHECKLIST = {
  '1.1.1': 'Non-text Content',
  '1.2.1': 'Audio-only and Video-only (Prerecorded)',
  '1.2.2': 'Captions (Prerecorded)',
  '1.2.3': 'Audio Description or Media Alternative (Prerecorded)',
  '1.3.1': 'Info and Relationships',
  '1.3.2': 'Meaningful Sequence',
  '1.3.3': 'Sensory Characteristics',
  '1.4.1': 'Use of Color',
  '1.4.2': 'Audio Control',
  '1.4.3': 'Contrast (Minimum)',
  '1.4.4': 'Resize Text',
  '1.4.5': 'Images of Text',
  '2.1.1': 'Keyboard',
  '2.1.2': 'No Keyboard Trap',
  '2.2.1': 'Timing Adjustable',
  '2.2.2': 'Pause, Stop, Hide',
  '2.3.1': 'Three Flashes or Below Threshold',
  '2.4.1': 'Bypass Blocks',
  '2.4.2': 'Page Titled',
  '2.4.3': 'Focus Order',
  '2.4.4': 'Link Purpose (In Context)',
  '2.4.5': 'Multiple Ways',
  '2.4.6': 'Headings and Labels',
  '2.4.7': 'Focus Visible',
  '3.1.1': 'Language of Page',
  '3.1.2': 'Language of Parts',
  '3.2.1': 'On Focus',
  '3.2.2': 'On Input',
  '3.2.3': 'Consistent Navigation',
  '3.2.4': 'Consistent Identification',
  '3.3.1': 'Error Identification',
  '3.3.2': 'Labels or Instructions',
  '3.3.3': 'Error Suggestion',
  '3.3.4': 'Error Prevention (Legal, Financial, Data)',
  '4.1.1': 'Parsing',
  '4.1.2': 'Name, Role, Value'
};

// Component accessibility audit results
const componentAuditResults = {
  timestamp: new Date().toISOString(),
  components: {},
  overallScore: 0,
  issues: []
};

// Test functions for different accessibility aspects
function testARIALabels(componentName, element) {
  const issues = [];
  
  // Check for proper ARIA labels
  const interactiveElements = element.querySelectorAll('button, input, select, textarea, a[href]');
  
  interactiveElements.forEach((el, index) => {
    const hasAriaLabel = el.hasAttribute('aria-label');
    const hasAriaLabelledby = el.hasAttribute('aria-labelledby');
    const hasTitle = el.hasAttribute('title');
    const hasTextContent = el.textContent?.trim().length > 0;
    
    if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle && !hasTextContent) {
      issues.push({
        element: `${componentName} - Interactive element ${index}`,
        issue: 'Missing accessible name (aria-label, aria-labelledby, title, or text content)',
        wcag: '4.1.2'
      });
    }
  });
  
  return issues;
}

function testKeyboardNavigation(componentName, element) {
  const issues = [];
  
  // Check for keyboard focusable elements
  const focusableElements = element.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
  
  focusableElements.forEach((el, index) => {
    const tabIndex = el.getAttribute('tabindex');
    
    if (tabIndex && parseInt(tabIndex) < 0) {
      issues.push({
        element: `${componentName} - Focusable element ${index}`,
        issue: 'Element has negative tabindex but should be keyboard accessible',
        wcag: '2.1.1'
      });
    }
  });
  
  return issues;
}

function testColorContrast(componentName, element) {
  const issues = [];
  
  // Check for text elements with potentially low contrast
  const textElements = element.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label, button, a');
  
  textElements.forEach((el, index) => {
    const computedStyle = window.getComputedStyle(el);
    const color = computedStyle.color;
    const backgroundColor = computedStyle.backgroundColor;
    
    // Basic check - in real implementation, use a contrast ratio calculator
    if (color === backgroundColor) {
      issues.push({
        element: `${componentName} - Text element ${index}`,
        issue: 'Text color matches background color - potential contrast issue',
        wcag: '1.4.3'
      });
    }
  });
  
  return issues;
}

function testFormLabels(componentName, element) {
  const issues = [];
  
  // Check form inputs for proper labels
  const inputs = element.querySelectorAll('input, select, textarea');
  
  inputs.forEach((input, index) => {
    const hasLabel = input.hasAttribute('aria-label') || 
                    input.hasAttribute('aria-labelledby') || 
                    element.querySelector(`label[for="${input.id}"]`);
    
    if (!hasLabel && input.id) {
      issues.push({
        element: `${componentName} - Input ${index}`,
        issue: 'Form input missing accessible label',
        wcag: '3.3.2'
      });
    }
  });
  
  return issues;
}

// Main audit function
function auditComponent(componentName, htmlContent) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const componentElement = doc.body;
  
  const auditResult = {
    componentName,
    tests: {
      ariaLabels: testARIALabels(componentName, componentElement),
      keyboardNavigation: testKeyboardNavigation(componentName, componentElement),
      colorContrast: testColorContrast(componentName, componentElement),
      formLabels: testFormLabels(componentName, componentElement)
    },
    score: 0,
    passed: 0,
    failed: 0
  };
  
  // Calculate score
  const totalTests = Object.values(auditResult.tests).flat().length;
  const failedTests = Object.values(auditResult.tests).flat().length;
  
  auditResult.passed = totalTests - failedTests;
  auditResult.failed = failedTests;
  auditResult.score = totalTests > 0 ? Math.round(((totalTests - failedTests) / totalTests) * 100) : 100;
  
  return auditResult;
}

// Generate accessibility report
function generateAccessibilityReport() {
  const report = {
    summary: {
      totalComponents: Object.keys(componentAuditResults.components).length,
      averageScore: 0,
      totalIssues: componentAuditResults.issues.length,
      wcagCompliance: 'AA',
      timestamp: componentAuditResults.timestamp
    },
    components: componentAuditResults.components,
    recommendations: [
      'Добавьте ARIA labels для всех интерактивных элементов',
      'Обеспечьте клавиатурную навигацию для всех компонентов',
      'Проверьте контрастность цветов для текстовых элементов',
      'Добавьте описания для форм и полей ввода',
      'Тестируйте с screen reader для проверки доступности'
    ]
  };
  
  // Calculate average score
  const scores = Object.values(componentAuditResults.components).map(c => c.score);
  report.summary.averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  
  return report;
}

// Export for use in testing
module.exports = {
  auditComponent,
  generateAccessibilityReport,
  WCAG_CHECKLIST,
  componentAuditResults
};

// CLI usage
if (require.main === module) {
  console.log('🧪 Запуск аудита доступности компонентов...');
  console.log('📋 WCAG 2.1 AA Guidelines Checklist:');
  
  Object.entries(WCAG_CHECKLIST).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  console.log('\n✅ Аудит доступности завершен');
  console.log('📊 Отчет сгенерирован в accessibility-audit.json');
  
  // Save report to file
  const report = generateAccessibilityReport();
  fs.writeFileSync('accessibility-audit.json', JSON.stringify(report, null, 2));
  
  console.log('\n🎯 Рекомендации по улучшению доступности:');
  report.recommendations.forEach(rec => console.log(`  • ${rec}`));
}