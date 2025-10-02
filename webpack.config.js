const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  const shouldAnalyze = env && env.analyze;

  return {
    // Оптимизация для production
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Выделяем vendor библиотеки в отдельный чанк
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Выделяем React в отдельный чанк
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
          // Выделяем UI компоненты
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 15,
          },
          // Общие компоненты
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
      // Минимизация в production
      minimize: isProduction,
      // Удаление мертвого кода
      usedExports: true,
      sideEffects: false,
    },

    // Настройки для разработки
    devtool: isProduction ? 'source-map' : 'eval-source-map',

    // Разрешение модулей
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },

    // Плагины
    plugins: [
      // Анализатор бандла (только при необходимости)
      ...(shouldAnalyze ? [new BundleAnalyzerPlugin()] : []),
    ],

    // Настройки производительности
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000, // 500kb
      maxAssetSize: 512000, // 500kb
    },

    // Исключения для node_modules (уменьшает размер бандла)
    externals: isProduction ? {
      // Исключаем большие библиотеки, если они не критичны
      // 'lodash': 'lodash',
    } : {},
  };
};