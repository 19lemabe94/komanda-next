# 🍺 Komanda App (V2) - MVP

Sistema web para gestão de comandas em tempo real, focado em agilidade e persistência de dados.

## 🚀 Tecnologias (Stack Gratuita)

* **Frontend:** [Next.js](https://nextjs.org/) (React)
* **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend/Banco:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Realtime)
* **Hospedagem:** Vercel

## 🎯 Objetivo do MVP

Criar um sistema funcional para substituir o papel, permitindo controle de mesas, vendas e fiados, operado por um Admin/Caixa.

## ⚠️ Regras de Ouro (Business Logic)

1.  **Venda Fiado "Inflacionária":**
    * Ao fechar uma conta como "Fiado", o sistema registra os itens.
    * Porém, **o valor da dívida é dinâmico**: Se o preço da cerveja aumentar no cadastro de produtos, a dívida de quem comprou essa cerveja fiado no passado aumenta também. O valor a ser pago é sempre baseado no preço **atual** do dia do pagamento, não do dia do consumo.
2.  **Identificação Obrigatória:**
    * Vendas "Fiado" exigem obrigatoriamente a seleção de um **Cliente Cadastrado**.
3.  **Tempo Real:**
    * O status das mesas (Livre/Ocupada) deve atualizar instantaneamente em todas as telas conectadas.

## 🗃️ Modelo de Dados (Supabase)

* **`users`**: Autenticação do sistema.
* **`clientes`**: (Nome, Telefone). Essencial para o Fiado.
* **`produtos`**: (Nome, Preço Atual, Categoria).
* **`comandas`**: (Mesa 0-15, Status, Cliente Vinculado).
* **`itens_comanda`**: (Produto, Quantidade).
* **`vendas`**: Registro do fechamento (Data, Forma Pagamento).

## 📋 Backlog (Sprint 1)

### Configuração
- [ ] Criar projeto no Supabase & Configurar tabelas.
- [ ] Iniciar projeto Next.js com Tailwind.
- [ ] Configurar variáveis de ambiente (.env).

### Funcionalidades
- [ ] **Auth:** Tela de Login simples.
- [ ] **Admin:** CRUD de Produtos (Criar e editar preços).
- [ ] **Admin:** CRUD de Clientes.
- [ ] **Dashboard:** Grid de Mesas (0-15) com status visual.
- [ ] **Fluxo:** Abrir Comanda -> Lançar Itens -> Fechar Comanda.
- [ ] **Checkout:**
    - [ ] Pagamento Dinheiro/Cartão (Preço fixo).
    - [ ] Pagamento Fiado (Vínculo com cliente).
- [ ] **Relatórios:** Tela de "Vendas do Dia" e "Dívidas em Aberto" (com cálculo atualizado).

## 🛠️ Como rodar

1. Clone o repo
2. `npm install`
3. Crie o arquivo `.env.local` com as chaves do Supabase.
4. `npm run dev`
