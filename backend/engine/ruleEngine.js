const _ = require('lodash');

/**
 * Rule Engine to evaluate conditions against input data.
 */
class RuleEngine {
  /**
   * Evaluates a string condition against given data.
   * Supports: ==, !=, <, >, <=, >=, &&, ||, contains, startsWith, endsWith
   * @param {string} condition - The condition string (e.g., "amount > 100 && country == 'US'")
   * @param {Object} data - The data object to evaluate against
   * @returns {boolean} - The result of the evaluation
   */
  static evaluate(condition, data) {
    if (condition === 'DEFAULT') return true;

    try {
      // Create a function body that returns the result of the expression
      // We map data keys to variables in the function scope
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      // Replace custom functions with JS equivalent
      let processedCondition = condition
        .replace(/contains\(([^,]+),\s*([^)]+)\)/g, '(($1).includes($2))')
        .replace(/startsWith\(([^,]+),\s*([^)]+)\)/g, '(($1).startsWith($2))')
        .replace(/endsWith\(([^,]+),\s*([^)]+)\)/g, '(($1).endsWith($2))');

      // Create a function with data keys as arguments
      const evalFunc = new Function(...keys, `return ${processedCondition};`);
      
      return !!evalFunc(...values);
    } catch (error) {
      console.error('Rule Engine Evaluation Error:', error.message);
      return false;
    }
  }
}

module.exports = RuleEngine;
