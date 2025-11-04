#!/bin/bash

###############################################################################
# Baseline Performance Testing Script
# Автоматизированное тестирование производительности для мобильных устройств
###############################################################################

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Конфигурация
OUTPUT_DIR="./docs/mobile/baseline-reports"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_DIR="${OUTPUT_DIR}/${TIMESTAMP}"
DEV_SERVER_URL="http://localhost:8080"

# Создаем директорию для отчетов
mkdir -p "${REPORT_DIR}"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Baseline Performance Testing - Mobile UI Optimization      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# Функция: Проверка наличия сервера
###############################################################################
check_server() {
    echo -e "${YELLOW}→ Проверка доступности dev сервера...${NC}"

    if curl -s --head --request GET "${DEV_SERVER_URL}" | grep "200\|301\|302" > /dev/null; then
        echo -e "${GREEN}✓ Сервер доступен: ${DEV_SERVER_URL}${NC}"
        return 0
    else
        echo -e "${RED}✗ Сервер недоступен. Запустите: npm run dev${NC}"
        return 1
    fi
}

###############################################################################
# Функция: Lighthouse Mobile Audit
###############################################################################
run_lighthouse_mobile() {
    local url=$1
    local page_name=$2
    local output_file="${REPORT_DIR}/lighthouse-${page_name}-mobile.html"
    local json_output="${REPORT_DIR}/lighthouse-${page_name}-mobile.json"

    echo -e "${YELLOW}→ Lighthouse Mobile: ${page_name}${NC}"

    npx lighthouse "${url}" \
        --preset=mobile \
        --throttling.cpuSlowdownMultiplier=4 \
        --output=html \
        --output=json \
        --output-path="${output_file%.html}" \
        --chrome-flags="--headless" \
        --quiet

    if [ -f "${output_file}" ]; then
        echo -e "${GREEN}✓ Отчет создан: ${output_file}${NC}"

        # Извлекаем основные метрики из JSON
        if [ -f "${json_output}" ]; then
            extract_lighthouse_scores "${json_output}" "${page_name}"
        fi
    else
        echo -e "${RED}✗ Ошибка создания отчета${NC}"
    fi
}

###############################################################################
# Функция: Извлечение метрик из Lighthouse JSON
###############################################################################
extract_lighthouse_scores() {
    local json_file=$1
    local page_name=$2

    # Используем jq для извлечения метрик (если установлен)
    if command -v jq &> /dev/null; then
        local performance=$(jq '.categories.performance.score * 100' "${json_file}")
        local accessibility=$(jq '.categories.accessibility.score * 100' "${json_file}")
        local best_practices=$(jq '.categories["best-practices"].score * 100' "${json_file}")
        local seo=$(jq '.categories.seo.score * 100' "${json_file}")

        local fcp=$(jq '.audits["first-contentful-paint"].numericValue' "${json_file}")
        local lcp=$(jq '.audits["largest-contentful-paint"].numericValue' "${json_file}")
        local tbt=$(jq '.audits["total-blocking-time"].numericValue' "${json_file}")
        local cls=$(jq '.audits["cumulative-layout-shift"].numericValue' "${json_file}")
        local si=$(jq '.audits["speed-index"].numericValue' "${json_file}")

        echo -e "\n${GREEN}Scores для ${page_name}:${NC}"
        echo "  Performance: ${performance}"
        echo "  Accessibility: ${accessibility}"
        echo "  Best Practices: ${best_practices}"
        echo "  SEO: ${seo}"
        echo ""
        echo "  FCP: ${fcp}ms"
        echo "  LCP: ${lcp}ms"
        echo "  TBT: ${tbt}ms"
        echo "  CLS: ${cls}"
        echo "  Speed Index: ${si}ms"
        echo ""

        # Сохраняем в CSV для дальнейшего анализа
        append_to_csv "${page_name}" "${performance}" "${accessibility}" "${fcp}" "${lcp}" "${cls}"
    else
        echo -e "${YELLOW}⚠ jq не установлен. Пропускаем извлечение метрик.${NC}"
    fi
}

###############################################################################
# Функция: Сохранение в CSV
###############################################################################
append_to_csv() {
    local page_name=$1
    local performance=$2
    local accessibility=$3
    local fcp=$4
    local lcp=$5
    local cls=$6

    local csv_file="${REPORT_DIR}/baseline-metrics.csv"

    # Создаем заголовок если файл не существует
    if [ ! -f "${csv_file}" ]; then
        echo "Page,Performance,Accessibility,FCP(ms),LCP(ms),CLS,Timestamp" > "${csv_file}"
    fi

    echo "${page_name},${performance},${accessibility},${fcp},${lcp},${cls},${TIMESTAMP}" >> "${csv_file}"
}

###############################################################################
# Функция: Bundle Size Analysis
###############################################################################
analyze_bundle_size() {
    echo -e "${YELLOW}→ Анализ размера бандлов...${NC}"

    # Запускаем production build
    npm run build > "${REPORT_DIR}/build.log" 2>&1

    # Копируем build stats
    if [ -d "dist" ]; then
        du -sh dist/ > "${REPORT_DIR}/bundle-size.txt"
        find dist/ -type f -name "*.js" -exec ls -lh {} \; >> "${REPORT_DIR}/bundle-size.txt"
        echo -e "${GREEN}✓ Анализ размера бандлов завершен${NC}"
    else
        echo -e "${RED}✗ Директория dist/ не найдена${NC}"
    fi
}

###############################################################################
# Функция: Создание сводного отчета
###############################################################################
generate_summary() {
    local summary_file="${REPORT_DIR}/SUMMARY.md"

    cat > "${summary_file}" << EOF
# Baseline Performance Report

**Дата**: ${TIMESTAMP}
**URL**: ${DEV_SERVER_URL}

## Lighthouse Scores

### Главная страница
- Performance: [См. HTML отчет]
- Accessibility: [См. HTML отчет]
- FCP: [См. HTML отчет]
- LCP: [См. HTML отчет]
- CLS: [См. HTML отчет]

### Страница генератора
- Performance: [См. HTML отчет]
- Accessibility: [См. HTML отчет]
- FCP: [См. HTML отчет]
- LCP: [См. HTML отчет]
- CLS: [См. HTML отчет]

### Библиотека треков
- Performance: [См. HTML отчет]
- Accessibility: [См. HTML отчет]
- FCP: [См. HTML отчет]
- LCP: [См. HTML отчет]
- CLS: [См. HTML отчет]

## Bundle Size
\`\`\`
$(cat "${REPORT_DIR}/bundle-size.txt" 2>/dev/null || echo "Данные недоступны")
\`\`\`

## Рекомендации

1. Проверить результаты Lighthouse отчетов в \`${REPORT_DIR}/\`
2. Сравнить с целевыми метриками:
   - Performance: >= 90
   - Accessibility: = 100
   - FCP: < 1.8s
   - LCP: < 2.5s
   - CLS: < 0.1

## Следующие шаги

- [ ] Проанализировать узкие места производительности
- [ ] Оптимизировать критические компоненты
- [ ] Повторить тестирование после оптимизации
- [ ] Сравнить результаты до/после

---

**Путь к отчетам**: \`${REPORT_DIR}\`
EOF

    echo -e "${GREEN}✓ Сводный отчет создан: ${summary_file}${NC}"
}

###############################################################################
# MAIN EXECUTION
###############################################################################

echo -e "${YELLOW}→ Начинаем baseline тестирование...${NC}"
echo ""

# 1. Проверяем сервер
if ! check_server; then
    exit 1
fi

# 2. Lighthouse audits для ключевых страниц
run_lighthouse_mobile "${DEV_SERVER_URL}/" "home"
run_lighthouse_mobile "${DEV_SERVER_URL}/workspace/generate" "generator"
run_lighthouse_mobile "${DEV_SERVER_URL}/workspace/library" "library"

# 3. Анализируем размер бандлов
analyze_bundle_size

# 4. Создаем сводный отчет
generate_summary

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Baseline тестирование завершено!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Отчеты сохранены в: ${REPORT_DIR}${NC}"
echo ""
echo -e "${GREEN}Откройте HTML отчеты в браузере:${NC}"
echo "  - ${REPORT_DIR}/lighthouse-home-mobile.html"
echo "  - ${REPORT_DIR}/lighthouse-generator-mobile.html"
echo "  - ${REPORT_DIR}/lighthouse-library-mobile.html"
echo ""
echo -e "${YELLOW}CSV метрики: ${REPORT_DIR}/baseline-metrics.csv${NC}"
echo ""
