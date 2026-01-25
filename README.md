# 🍔 KOMANDA - Sistema de Gestão para Restaurantes

> Sistema de PDV (Ponto de Venda) e Gestão Web desenvolvido para a "Toca do Bezerra".

Este projeto é uma aplicação web **Mobile-First** construída com **Next.js 16 (App Router)** e **Supabase**, focada em agilidade operacional, responsividade em dispositivos móveis e controle de acesso hierárquico.

---

## 🛠 Tech Stack

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **Linguagem:** TypeScript
* **Estilização:** CSS-in-JS (Objetos de estilo nativos) / Sem frameworks de UI pesados para garantir performance.
* **Banco de Dados & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
* **Gráficos:** Recharts
* **Deploy:** Vercel

---

## 🚀 Funcionalidades Principais

### 📱 1. Operação (Frente de Caixa)
* **Mobile First UX:** Interface otimizada para celulares, com menus hambúrguer animados, botões grandes e modais ajustados para viewport dinâmico (`dvh`).
* **Gestão de Mesas:** Abertura, lançamento de itens e fechamento de conta.
* **Widgets:** Relógio em tempo real e Versículo do Dia (rotativo via algoritmo hash de data).

### 🛡️ 2. Controle de Acesso (RBAC)
O sistema implementa distinção entre **Admin** e **Funcionário** (`profiles.role`):
* **Admin:** Acesso total (Relatórios, Cardápio, Squad, Exclusão de Vendas, Backup).
* **Funcionário:** Acesso operacional restrito.
    * *Restrição:* Não pode remover itens lançados (apenas visualizar).
    * *Restrição:* Não pode excluir mesas.
    * *Restrição:* Não acessa áreas gerenciais.

### 📊 3. Inteligência de Negócio
* **Dashboard Financeiro:** Totais do dia separados por método de pagamento (Pix, Dinheiro, Cartão, Fiado).
* **Relatórios:** Filtros por período (Hoje, 7 dias, Mês), Top Produtos e Mix de Categorias.

### 💾 4. Segurança de Dados
* **Backup Local:** Funcionalidade exclusiva de Admin para exportar todo o banco de dados em formato `.json`.
* **Restore:** Capacidade de importar o arquivo JSON para restaurar dados em caso de emergência.

---

## 📂 Estrutura do Projeto

```bash
/app
  /api           # API Routes (Server-side) para gestão de usuários (Admin Auth)
  /components    # Componentes Reutilizáveis (Header, Modais, Logo)
  /products      # CRUD de Cardápio
  /reports       # Dashboards e Gráficos
  /squad         # Gestão de Usuários (Create/Edit/Delete)
  /styles        # Tema Global (Cores, Estilos base)
  /vendas        # Histórico de Vendas Fechadas
  page.tsx       # Dashboard Operacional (Home)
  layout.tsx     # Layout Global (Metadados, Fontes)

  