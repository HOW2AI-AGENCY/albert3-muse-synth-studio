# 📊 Monitoring Dashboard Guide

## Overview

This guide describes the monitoring infrastructure for Albert3 Muse Synth Studio, including key metrics, SLOs, and alerting procedures.

## Key Metrics

### Performance Metrics
- **LCP (Largest Contentful Paint)**: Target < 2.5s
- **FID (First Input Delay)**: Target < 100ms
- **CLS (Cumulative Layout Shift)**: Target < 0.1
- **Generation Time**: Target < 60s (Suno), < 45s (Mureka)

### Reliability Metrics
- **API Success Rate**: Target > 95%
- **Circuit Breaker State**: Monitor open/half-open events
- **Retry Success Rate**: Target > 80%
- **Cache Hit Rate**: Target > 40%

### Business Metrics
- **Active Users**: Real-time count
- **Generations/Hour**: Track usage patterns
- **Error Rate**: Target < 0.1%

## SLOs (Service Level Objectives)

- **Uptime**: 99.9%
- **API Response Time (p95)**: < 300ms
- **Generation Success Rate**: > 95%

## Alert Response

### Critical Alerts
- Circuit breaker open > 5 minutes
- Error rate > 1%
- Generation success rate < 90%

**Action**: Check provider status, review logs, escalate if needed.

### Warning Alerts
- Cache hit rate < 30%
- LCP > 4s
- Memory usage > 80%

**Action**: Monitor trends, investigate if persistent.
