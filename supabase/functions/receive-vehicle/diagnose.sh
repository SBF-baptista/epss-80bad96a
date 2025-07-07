#!/bin/bash

# Script de Diagnóstico para Erro 401 "Authentication failed"
# Execute este script para identificar o problema de autenticação

echo "=== DIAGNÓSTICO DE AUTENTICAÇÃO - RECEIVE VEHICLE API ==="
echo ""

# Verificar se a API key foi fornecida
if [ -z "$1" ]; then
    echo "❌ ERRO: Forneça a API key como parâmetro"
    echo "Uso: $0 SUA_API_KEY_AQUI"
    echo ""
    echo "Exemplo: $0 abc123def456..."
    exit 1
fi

API_KEY="$1"
BASE_URL="https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle"

echo "🔍 API Key fornecida: ${API_KEY:0:8}...${API_KEY: -4}"
echo "🌐 URL do endpoint: $BASE_URL"
echo ""

echo "=== TESTE 1: Diagnóstico Detalhado de Autenticação ==="
echo "Executando: curl \"$BASE_URL?auth-debug=true\" -H \"x-api-key: $API_KEY\""
echo ""

RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$BASE_URL?auth-debug=true" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "📊 Status HTTP: $HTTP_CODE"
echo "📄 Resposta:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Diagnóstico executado com sucesso!"
    echo ""
    
    # Verificar se a autenticação passou
    AUTH_SUCCESS=$(echo "$BODY" | jq -r '.authentication_result.keys_match_exact' 2>/dev/null)
    if [ "$AUTH_SUCCESS" = "true" ]; then
        echo "✅ AUTENTICAÇÃO OK! Pode prosseguir com requisições normais."
        
        echo ""
        echo "=== TESTE 2: Requisição de Teste com Dados Reais ==="
        echo "Testando envio de dados..."
        
        TEST_DATA='[{"company_name":"Teste Diagnóstico","usage_type":"particular","vehicles":[{"vehicle":"Teste","brand":"Teste"}]}]'
        
        REAL_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST "$BASE_URL" \
            -H "x-api-key: $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$TEST_DATA")
        
        REAL_HTTP_CODE=$(echo "$REAL_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
        REAL_BODY=$(echo "$REAL_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')
        
        echo "📊 Status HTTP: $REAL_HTTP_CODE"
        echo "📄 Resposta:"
        echo "$REAL_BODY" | jq '.' 2>/dev/null || echo "$REAL_BODY"
        
        if [ "$REAL_HTTP_CODE" = "201" ]; then
            echo ""
            echo "🎉 SUCESSO TOTAL! A API está funcionando corretamente."
        else
            echo ""
            echo "⚠️ Autenticação OK, mas há problema com o formato dos dados."
        fi
    else
        echo "❌ PROBLEMA DE AUTENTICAÇÃO DETECTADO!"
        echo ""
        echo "🔧 SOLUÇÕES RECOMENDADAS:"
        echo "$BODY" | jq -r '.recommendations[]?' 2>/dev/null | sed 's/^/   - /'
    fi
else
    echo "❌ Falha no diagnóstico (HTTP $HTTP_CODE)"
    echo "Verifique se a URL está correta e se há conectividade com o servidor."
fi

echo ""
echo "=== TESTE 3: Diagnóstico de Configuração ==="
echo "Verificando configuração do servidor..."

CONFIG_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$BASE_URL?config-debug=true" \
    -H "x-api-key: $API_KEY")

CONFIG_HTTP_CODE=$(echo "$CONFIG_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
CONFIG_BODY=$(echo "$CONFIG_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "📊 Status HTTP: $CONFIG_HTTP_CODE"
echo "📄 Resposta:"
echo "$CONFIG_BODY" | jq '.' 2>/dev/null || echo "$CONFIG_BODY"

if [ "$CONFIG_HTTP_CODE" = "200" ]; then
    echo "✅ Diagnóstico de configuração executado com sucesso!"
    
    # Check for configuration issues
    CONFIG_ISSUES=$(echo "$CONFIG_BODY" | jq -r '.configuration_issues[]?' 2>/dev/null)
    if [ ! -z "$CONFIG_ISSUES" ]; then
        echo ""
        echo "⚠️ PROBLEMAS DE CONFIGURAÇÃO DETECTADOS:"
        echo "$CONFIG_BODY" | jq -r '.configuration_issues[]?' 2>/dev/null | sed 's/^/   - /'
        echo ""
        echo "🔧 RECOMENDAÇÕES:"
        echo "$CONFIG_BODY" | jq -r '.recommendations[]?' 2>/dev/null | sed 's/^/   - /'
    fi
else
    echo "❌ Falha no diagnóstico de configuração (HTTP $CONFIG_HTTP_CODE)"
fi

echo ""
echo "=== TESTE 4: Conectividade Básica ==="
echo "Testando endpoint básico..."

BASIC_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" "$BASE_URL?test=true" \
    -H "x-api-key: $API_KEY")

BASIC_HTTP_CODE=$(echo "$BASIC_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
BASIC_BODY=$(echo "$BASIC_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//')

echo "📊 Status HTTP: $BASIC_HTTP_CODE"
if [ "$BASIC_HTTP_CODE" = "200" ]; then
    echo "✅ Conectividade OK!"
else
    echo "❌ Problema de conectividade (HTTP $BASIC_HTTP_CODE)"
fi

echo ""
echo "=== RESUMO DO DIAGNÓSTICO ==="
echo "Auth Debug: HTTP $HTTP_CODE"
echo "Config Debug: HTTP $CONFIG_HTTP_CODE"
echo "Basic Test: HTTP $BASIC_HTTP_CODE"
if [ ! -z "$REAL_HTTP_CODE" ]; then
    echo "Real Data: HTTP $REAL_HTTP_CODE"
fi

echo ""
echo "📋 Se o problema persistir, envie esta saída completa para o suporte técnico."