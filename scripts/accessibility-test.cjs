// Accessibility testing script for React components
// Tests ARIA attributes, keyboard navigation, and semantic HTML

const fs = require('fs');
const { JSDOM } = require('jsdom');

// Create a virtual DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const { window } = dom;
const { document } = window;

// Global DOM for testing
global.window = window;
global.document = document;
global.HTMLElement = window.HTMLElement;
global.MouseEvent = window.MouseEvent;
global.KeyboardEvent = window.KeyboardEvent;
global.FocusEvent = window.FocusEvent;

// Component accessibility test results
const accessibilityResults = {
  timestamp: new Date().toISOString(),
  components: {},
  overallScore: 0,
  issues: [],
  passed: 0,
  failed: 0
};

// WCAG 2.1 AA Test Functions
class AccessibilityTester {
  constructor() {
    this.issues = [];
    this.passed = 0;
    this.failed = 0;
  }

  // Test ARIA attributes and roles
  testARIAAttributes(componentName, element) {
    const tests = [];
    
    // Check for proper ARIA labels on interactive elements
    const interactiveElements = element.querySelectorAll('button, input, select, textarea, a[href], [role="button"], [role="link"]');
    
    interactiveElements.forEach((el, index) => {
      const hasAriaLabel = el.hasAttribute('aria-label');
      const hasAriaLabelledby = el.hasAttribute('aria-labelledby');
      const hasTitle = el.hasAttribute('title');
      const hasTextContent = el.textContent?.trim().length > 0;
      const hasAriaDescribedby = el.hasAttribute('aria-describedby');
      
      const test = {
        element: `${componentName} - Interactive element ${index} (${el.tagName})`,
        test: 'ARIA Labels and Descriptions',
        wcag: '4.1.2',
        passed: hasAriaLabel || hasAriaLabelledby || hasTitle || hasTextContent,
        details: {
          hasAriaLabel,
          hasAriaLabelledby,
          hasTitle,
          hasTextContent,
          hasAriaDescribedby
        }
      };
      
      tests.push(test);
      this.updateScore(test.passed);
    });

    return tests;
  }

  // Test keyboard navigation
  testKeyboardNavigation(componentName, element) {
    const tests = [];
    
    // Check for keyboard focusable elements
    const focusableElements = element.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"]'
    );
    
    focusableElements.forEach((el, index) => {
      const tabIndex = el.getAttribute('tabindex');
      const isFocusable = !tabIndex || parseInt(tabIndex) >= 0;
      
      const test = {
        element: `${componentName} - Focusable element ${index} (${el.tagName})`,
        test: 'Keyboard Accessibility',
        wcag: '2.1.1',
        passed: isFocusable,
        details: {
          tabIndex,
          isFocusable,
          tagName: el.tagName
        }
      };
      
      tests.push(test);
      this.updateScore(test.passed);
    });

    // Test for keyboard trap prevention
    const modalElements = element.querySelectorAll('[role="dialog"], [role="alertdialog"]');
    modalElements.forEach((el, index) => {
      const hasFocusManagement = el.hasAttribute('aria-modal') || 
                                el.querySelector('[data-focus-trap]') ||
                                el.querySelector('[role="document"]');
      
      const test = {
        element: `${componentName} - Modal element ${index}`,
        test: 'Keyboard Trap Prevention',
        wcag: '2.1.2',
        passed: hasFocusManagement,
        details: {
          hasAriaModal: el.hasAttribute('aria-modal'),
          hasFocusTrap: !!el.querySelector('[data-focus-trap]'),
          hasDocumentRole: !!el.querySelector('[role="document"]')
        }
      };
      
      tests.push(test);
      this.updateScore(test.passed);
    });

    return tests;
  }

  // Test form labels and instructions
  testFormLabels(componentName, element) {
    const tests = [];
    
    // Check form inputs for proper labels
    const inputs = element.querySelectorAll('input, select, textarea');
    
    inputs.forEach((input, index) => {
      const hasLabel = input.hasAttribute('aria-label') || 
                      input.hasAttribute('aria-labelledby') || 
                      input.hasAttribute('placeholder') ||
                      document.querySelector(`label[for="${input.id}"]`);
      
      const hasInstructions = input.hasAttribute('aria-describedby') ||
                             input.hasAttribute('title') ||
                             document.querySelector(`[id="${input.getAttribute('aria-describedby')}"]`);
      
      const test = {
        element: `${componentName} - Input ${index} (${input.type || input.tagName})`,
        test: 'Form Labels and Instructions',
        wcag: '3.3.2',
        passed: hasLabel,
        details: {
          hasLabel,
          hasInstructions,
          inputType: input.type || input.tagName,
          inputId: input.id
        }
      };
      
      tests.push(test);
      this.updateScore(test.passed);
    });

    return tests;
  }

  // Test color contrast (basic check)
  testColorContrast(componentName, element) {
    const tests = [];
    
    // Check for text elements
    const textElements = element.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, label, button, a, [role="text"]');
    
    textElements.forEach((el, index) => {
      const computedStyle = window.getComputedStyle(el);
      const color = computedStyle.color;
      const backgroundColor = computedStyle.backgroundColor;
      
      // Basic contrast check (in real implementation, use proper contrast ratio calculation)
      const hasDifferentColors = color !== backgroundColor && 
                                color !== 'transparent' && 
                                backgroundColor !== 'transparent';
      
      const test = {
        element: `${componentName} - Text element ${index} (${el.tagName})`,
        test: 'Color Contrast',
        wcag: '1.4.3',
        passed: hasDifferentColors,
        details: {
          color,
          backgroundColor,
          hasDifferentColors
        }
      };
      
      tests.push(test);
      this.updateScore(test.passed);
    });

    return tests;
  }

  // Test semantic HTML structure
  testSemanticStructure(componentName, element) {
    const tests = [];
    
    // Check for proper heading hierarchy
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      const isProperHierarchy = previousLevel === 0 || level <= previousLevel + 1;
      
      const test = {
        element: `${componentName} - Heading ${index} (${heading.tagName})`,
        test: 'Heading Hierarchy',
        wcag: '1.3.1',
        passed: isProperHierarchy,
        details: {
          level,
          previousLevel,
          isProperHierarchy
        }
      };
      
      tests.push(test);
      this.updateScore(test.passed);
      previousLevel = level;
    });

    // Check for proper landmark roles
    const landmarks = element.querySelectorAll('main, nav, aside, header, footer, [role="main"], [role="navigation"]');
    
    landmarks.forEach((landmark, index) => {
      const hasLabel = landmark.hasAttribute('aria-label') || landmark.hasAttribute('aria-labelledby');
      
      const test = {
        element: `${componentName} - Landmark ${index} (${landmark.tagName})`,
        test: 'Landmark Labels',
        wcag: '2.4.1',
        passed: hasLabel,
        details: {
          tagName: landmark.tagName,
          hasLabel
        }
      };
      
      tests.push(test);
      this.updateScore(test.passed);
    });

    return tests;
  }

  // Test focus management
  testFocusManagement(componentName, element) {
    const tests = [];
    
    // Check for focus indicators
    const focusableElements = element.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
    
    focusableElements.forEach((el, index) => {
      const computedStyle = window.getComputedStyle(el, ':focus');
      const hasFocusIndicator = computedStyle.outline !== 'none' || 
                             computedStyle.boxShadow !== 'none' ||
                             computedStyle.border !== 'none';
      
      const test = {
        element: `${componentName} - Focusable element ${index} (${el.tagName})`,
        test: 'Focus Indicators',
        wcag: '2.4.7',
        passed: hasFocusIndicator,
        details: {
          hasOutline: computedStyle.outline !== 'none',
          hasBoxShadow: computedStyle.boxShadow !== 'none',
          hasBorder: computedStyle.border !== 'none'
        }
      };
      
      tests.push(test);
      this.updateScore(test.passed);
    });

    return tests;
  }

  updateScore(passed) {
    if (passed) {
      this.passed++;
    } else {
      this.failed++;
    }
  }

  getScore() {
    const total = this.passed + this.failed;
    return total > 0 ? Math.round((this.passed / total) * 100) : 100;
  }
}

// Test individual components
function testComponent(componentName, htmlString) {
  const tester = new AccessibilityTester();
  
  // Create element from HTML string
  const wrapper = document.createElement('div');
  wrapper.innerHTML = htmlString;
  const element = wrapper.firstElementChild;
  
  if (!element) {
    return {
      componentName,
      error: 'Invalid HTML provided',
      score: 0
    };
  }

  // Run all accessibility tests
  const results = {
    ariaAttributes: tester.testARIAAttributes(componentName, element),
    keyboardNavigation: tester.testKeyboardNavigation(componentName, element),
    formLabels: tester.testFormLabels(componentName, element),
    colorContrast: tester.testColorContrast(componentName, element),
    semanticStructure: tester.testSemanticStructure(componentName, element),
    focusManagement: tester.testFocusManagement(componentName, element)
  };

  // Collect all issues
  const allTests = Object.values(results).flat();
  const issues = allTests.filter(test => !test.passed);
  
  return {
    componentName,
    score: tester.getScore(),
    passed: tester.passed,
    failed: tester.failed,
    results,
    issues
  };
}

// Test our design system components
function testDesignSystemComponents() {
  const components = {
    Button: '<button class="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">Click me</button>',
    
    Input: '<input class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" placeholder="Enter text" aria-label="Text input">',
    
    Select: '<div class="relative"><select class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"><option>Option 1</option><option>Option 2</option></select></div>',
    
    Dialog: '<div role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center"><div class="bg-background rounded-lg shadow-lg p-6 max-w-md w-full"><h2 id="dialog-title">Dialog Title</h2><div id="dialog-description">Dialog description</div><button>Close</button></div></div>',
    
    Card: '<div class="rounded-lg border bg-card text-card-foreground shadow-sm"><div class="flex flex-col space-y-1.5 p-6"><h3 class="text-2xl font-semibold leading-none tracking-tight">Card Title</h3><p class="text-sm text-muted-foreground">Card description</p></div><div class="p-6 pt-0">Card content</div></div>',
    
    Badge: '<span class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">Badge</span>',
    
    Progress: '<div role="progressbar" aria-valuenow="30" aria-valuemin="0" aria-valuemax="100" class="relative h-4 w-full overflow-hidden rounded-full bg-secondary"><div class="h-full bg-primary transition-all" style="width: 30%"></div></div>'
  };

  console.log('🧪 Запуск тестирования доступности компонентов...\n');

  Object.entries(components).forEach(([name, html]) => {
    console.log(`Тестирование компонента: ${name}`);
    const result = testComponent(name, html);
    
    accessibilityResults.components[name] = result;
    accessibilityResults.issues.push(...result.issues);
    
    console.log(`  Оценка доступности: ${result.score}/100`);
    console.log(`  Пройдено тестов: ${result.passed}`);
    console.log(`  Провалено тестов: ${result.failed}`);
    
    if (result.issues.length > 0) {
      console.log(`  ⚠️  Найдено проблем: ${result.issues.length}`);
      result.issues.forEach(issue => {
        console.log(`    - ${issue.issue} (WCAG ${issue.wcag})`);
      });
    }
    
    console.log('');
  });

  // Calculate overall score
  const scores = Object.values(accessibilityResults.components).map(c => c.score);
  accessibilityResults.overallScore = scores.length > 0 ? 
    Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  
  return accessibilityResults;
}

// Generate accessibility report
function generateReport() {
  const results = testDesignSystemComponents();
  
  const report = {
    summary: {
      timestamp: results.timestamp,
      overallScore: results.overallScore,
      totalComponents: Object.keys(results.components).length,
      totalIssues: results.issues.length,
      wcagCompliance: results.overallScore >= 90 ? 'AA' : results.overallScore >= 70 ? 'A' : 'Non-compliant'
    },
    components: results.components,
    recommendations: [
      'Добавьте ARIA labels для всех интерактивных элементов',
      'Обеспечьте клавиатурную навигацию для всех компонентов',
      'Проверьте контрастность цветов для текстовых элементов',
      'Добавьте описания для форм и полей ввода',
      'Используйте семантический HTML',
      'Обеспечьте видимые индикаторы фокуса',
      'Тестируйте с screen reader для проверки доступности'
    ]
  };
  
  return report;
}

// Export for use in other scripts
module.exports = {
  AccessibilityTester,
  testComponent,
  testDesignSystemComponents,
  generateReport
};

// CLI usage
if (require.main === module) {
  console.log('♿ Запуск тестирования доступности дизайн-системы...\n');
  
  const report = generateReport();
  
  console.log('\n📊 Отчет о доступности:');
  console.log(`Общая оценка: ${report.summary.overallScore}/100`);
  console.log(`Уровень соответствия: WCAG 2.1 ${report.summary.wcagCompliance}`);
  console.log(`Всего компонентов: ${report.summary.totalComponents}`);
  console.log(`Найдено проблем: ${report.summary.totalIssues}`);
  
  console.log('\n🎯 Результаты по компонентам:');
  Object.entries(report.components).forEach(([name, result]) => {
    console.log(`  ${name}: ${result.score}/100 (${result.issues.length} проблем)`);
  });
  
  console.log('\n💡 Рекомендации по улучшению:');
  report.recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });
  
  // Save report to file
  fs.writeFileSync('accessibility-test-report.json', JSON.stringify(report, null, 2));
  console.log('\n📄 Полный отчет сохранен в accessibility-test-report.json');
}