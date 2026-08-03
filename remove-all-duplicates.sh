#!/bin/bash

echo "🗑️ ELIMINAZIONE TUTTI I DUPLICATI"
echo "================================"
echo ""

# myzubster
echo "📁 myzubster - Eliminazione duplicati..."
for issue in 206 168 117 187 165 169 162 121 196 163 167 166 170 191 194 195 215 214 213 212; do
    gh issue close $issue --repo MyZubster-Ecosystem/myzubster --comment "Duplicate closed" 2>/dev/null && echo "✅ Chiusa #$issue" || echo "⚠️ Issue #$issue già chiusa o non esiste"
done

# MyZubster-Robot
echo ""
echo "📁 MyZubster-Robot - Eliminazione duplicati..."
gh issue close 59 --repo MyZubster-Ecosystem/MyZubster-Robot --comment "Duplicate of #49" 2>/dev/null && echo "✅ Chiusa #59" || echo "⚠️ Issue #59 già chiusa"

# MyZubsterGateway
echo ""
echo "📁 MyZubsterGateway - Eliminazione duplicati..."
for issue in 45 46 97 98 65 66 61 64 212 211 214 213 167 169 168 166 165 89; do
    gh issue close $issue --repo MyZubster-Ecosystem/MyZubsterGateway --comment "Duplicate closed" 2>/dev/null && echo "✅ Chiusa #$issue" || echo "⚠️ Issue #$issue già chiusa o non esiste"
done

# MyZubster-App
echo ""
echo "📁 MyZubster-App - Eliminazione duplicati..."
for issue in 39 40 42 25 26; do
    gh issue close $issue --repo MyZubster-Ecosystem/MyZubster-App --comment "Duplicate closed" 2>/dev/null && echo "✅ Chiusa #$issue" || echo "⚠️ Issue #$issue già chiusa o non esiste"
done

# myzubster-docs
echo ""
echo "📁 myzubster-docs - Eliminazione duplicati..."
for issue in 34 37 39 38 9 10 21; do
    gh issue close $issue --repo MyZubster-Ecosystem/myzubster-docs --comment "Duplicate closed" 2>/dev/null && echo "✅ Chiusa #$issue" || echo "⚠️ Issue #$issue già chiusa o non esiste"
done

# myzubster-animal-registry
echo ""
echo "📁 myzubster-animal-registry - Eliminazione duplicati..."
gh issue close 17 --repo MyZubster-Ecosystem/myzubster-animal-registry --comment "Duplicate of #16" 2>/dev/null && echo "✅ Chiusa #17" || echo "⚠️ Issue #17 già chiusa"

echo ""
echo "✅ TUTTI I DUPLICATI SONO STATI ELIMINATI!"
