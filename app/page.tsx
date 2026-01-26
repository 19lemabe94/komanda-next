'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from './lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from './styles/theme'
import { Header } from './components/Header'
import { OrderDetailsModal } from './components/OrderDetailsModal'

// --- ÍCONE SVG DA LIXEIRA (NOVO) ---
const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
)

type Order = {
  id: string; label: string; status: 'aberta' | 'pagamento' | 'concluida' | 'cancelada'; total: number; org_id: string;
}

// --- LISTA DE VERSÍCULOS ---
const VERSICULOS = [
  { text: "O Senhor é o meu pastor; de nada terei falta.", ref: "Salmos 23:1" },
  { text: "Tudo posso naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "Entregue o seu caminho ao Senhor; confie nele, e ele agirá.", ref: "Salmos 37:5" },
  { text: "Até aqui nos ajudou o Senhor.", ref: "1 Samuel 7:12" },
  { text: "Se Deus é por nós, quem será contra nós?", ref: "Romanos 8:31" },
  { text: "O Senhor é a minha luz e a minha salvação; de quem terei temor?", ref: "Salmos 27:1" },
  { text: "Esforçai-vos, e ele fortalecerá o vosso coração.", ref: "Salmos 31:24" },
  { text: "Mil cairão ao teu lado, e dez mil à tua direita, mas não chegará a ti.", ref: "Salmos 91:7" },
  { text: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor.", ref: "Jeremias 29:11" },
  { text: "Alegrai-vos sempre no Senhor; outra vez digo, alegrai-vos.", ref: "Filipenses 4:4" },
  { text: "O amor é paciente, o amor é bondoso.", ref: "1 Coríntios 13:4" },
  { text: "Não tenhas medo, pois eu estou contigo.", ref: "Isaías 41:10" },
  { text: "Buscai primeiro o Reino de Deus, e a sua justiça.", ref: "Mateus 6:33" },
  { text: "O Senhor é o meu rochedo, e o meu lugar forte, e o meu libertador.", ref: "Salmos 18:2" },
  { text: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.", ref: "Provérbios 3:5" },
  { text: "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho.", ref: "Salmos 119:105" },
  { text: "Aquele que habita no esconderijo do Altíssimo, à sombra do Onipotente descansará.", ref: "Salmos 91:1" },
  { text: "O Senhor te abençoe e te guarde.", ref: "Números 6:24" },
  { text: "Grandes coisas fez o Senhor por nós, pelas quais estamos alegres.", ref: "Salmos 126:3" },
  { text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", ref: "Mateus 11:28" },
  { text: "Porque para Deus nada é impossível.", ref: "Lucas 1:37" },
  { text: "Mas os que esperam no Senhor renovarão as forças.", ref: "Isaías 40:31" },
  { text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", ref: "Salmos 46:1" },
  { text: "Agrada-te do Senhor, e ele satisfará os desejos do teu coração.", ref: "Salmos 37:4" },
  { text: "Crê no Senhor Jesus e serás salvo, tu e a tua casa.", ref: "Atos 16:31" },
  { text: "O Senhor pelejará por vós, e vós vos calareis.", ref: "Êxodo 14:14" },
  { text: "Não se turbe o vosso coração; credes em Deus, crede também em mim.", ref: "João 14:1" },
  { text: "Eu sou o caminho, e a verdade e a vida; ninguém vem ao Pai, senão por mim.", ref: "João 14:6" },
  { text: "Ainda que eu andasse pelo vale da sombra da morte, não temeria mal algum.", ref: "Salmos 23:4" },
  { text: "Pedi, e dar-se-vos-á; buscai, e encontrareis; batei, e abrir-se-vos-á.", ref: "Mateus 7:7" },
  { text: "Bem-aventurados os pacificadores, porque eles serão chamados filhos de Deus.", ref: "Mateus 5:9" },
  { text: "O choro pode durar uma noite, mas a alegria vem pela manhã.", ref: "Salmos 30:5" },
  { text: "Sejam fortes e corajosos. Não tenham medo.", ref: "Deuteronômio 31:6" },
  { text: "Toda a Escritura é divinamente inspirada e proveitosa para ensinar.", ref: "2 Timóteo 3:16" },
  { text: "Combati o bom combate, acabei a carreira, guardei a fé.", ref: "2 Timóteo 4:7" },
  { text: "O Senhor é bom, uma fortaleza no dia da angústia.", ref: "Naum 1:7" },
  { text: "Provai, e vede que o Senhor é bom.", ref: "Salmos 34:8" },
  { text: "Ensina-nos a contar os nossos dias, para que alcancemos coração sábio.", ref: "Salmos 90:12" },
  { text: "Em paz também me deitarei e dormirei, porque só tu, Senhor, me fazes habitar em segurança.", ref: "Salmos 4:8" },
  { text: "A resposta branda desvia o furor, mas a palavra dura suscita a ira.", ref: "Provérbios 15:1" },
  { text: "O coração alegre aformoseia o rosto.", ref: "Provérbios 15:13" },
  { text: "O temor do Senhor é o princípio da sabedoria.", ref: "Provérbios 9:10" },
  { text: "Guarda o teu coração, porque dele procedem as fontes da vida.", ref: "Provérbios 4:23" },
  { text: "Melhor é o pouco com o temor do Senhor, do que um grande tesouro onde há inquietação.", ref: "Provérbios 15:16" },
  { text: "O Senhor te guardará de todo o mal; guardará a tua alma.", ref: "Salmos 121:7" },
  { text: "Elevo os meus olhos para os montes; de onde me vem o socorro?", ref: "Salmos 121:1" },
  { text: "O meu socorro vem do Senhor que fez o céu e a terra.", ref: "Salmos 121:2" },
  { text: "Não fui eu que ordenei a você? Seja forte e corajoso!", ref: "Josué 1:9" },
  { text: "Deus é espírito, e importa que os que o adoram o adorem em espírito e em verdade.", ref: "João 4:24" },
  { text: "E conhecereis a verdade, e a verdade vos libertará.", ref: "João 8:32" },
  { text: "Eu vim para que tenham vida, e a tenham com abundância.", ref: "João 10:10" },
  { text: "Deixo-vos a paz, a minha paz vos dou.", ref: "João 14:27" },
  { text: "Permanecei em mim, e eu permanecerei em vós.", ref: "João 15:4" },
  { text: "Ninguém tem maior amor do que este, de dar alguém a sua vida pelos seus amigos.", ref: "João 15:13" },
  { text: "Justificados, pois, pela fé, tenhamos paz com Deus.", ref: "Romanos 5:1" },
  { text: "Mas Deus prova o seu amor para conosco, em que Cristo morreu por nós.", ref: "Romanos 5:8" },
  { text: "Porque o salário do pecado é a morte, mas o dom gratuito de Deus é a vida eterna.", ref: "Romanos 6:23" },
  { text: "Não vos conformeis com este mundo, mas transformai-vos.", ref: "Romanos 12:2" },
  { text: "Alegrai-vos na esperança, sede pacientes na tribulação, perseverai na oração.", ref: "Romanos 12:12" },
  { text: "Porque dele e por ele, e para ele, são todas as coisas.", ref: "Romanos 11:36" },
  { text: "Ou não sabeis que o vosso corpo é o templo do Espírito Santo?", ref: "1 Coríntios 6:19" },
  { text: "Portanto, quer comais quer bebais, ou façais outra qualquer coisa, fazei tudo para glória de Deus.", ref: "1 Coríntios 10:31" },
  { text: "Agora, pois, permanecem a fé, a esperança e o amor, estes três, mas o maior destes é o amor.", ref: "1 Coríntios 13:13" },
  { text: "Vigiai, estai firmes na fé; portai-vos varonilmente, e fortalecei-vos.", ref: "1 Coríntios 16:13" },
  { text: "Porque andamos por fé, e não por vista.", ref: "2 Coríntios 5:7" },
  { text: "A minha graça te basta, porque o meu poder se aperfeiçoa na fraqueza.", ref: "2 Coríntios 12:9" },
  { text: "Levai as cargas uns dos outros, e assim cumprireis a lei de Cristo.", ref: "Gálatas 6:2" },
  { text: "Não nos cansemos de fazer o bem.", ref: "Gálatas 6:9" },
  { text: "Pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus.", ref: "Efésios 2:8" },
  { text: "Revesti-vos de toda a armadura de Deus.", ref: "Efésios 6:11" },
  { text: "Aquele que começou a boa obra em vós há de aperfeiçoá-la.", ref: "Filipenses 1:6" },
  { text: "Para mim o viver é Cristo, e o morrer é ganho.", ref: "Filipenses 1:21" },
  { text: "Nada façais por contenda ou por vanglória, mas por humildade.", ref: "Filipenses 2:3" },
  { text: "O meu Deus suprirá todas as vossas necessidades.", ref: "Filipenses 4:19" },
  { text: "A palavra de Cristo habite em vós abundantemente.", ref: "Colossenses 3:16" },
  { text: "Tudo quanto fizerdes, fazei-o de todo o coração, como ao Senhor.", ref: "Colossenses 3:23" },
  { text: "Orai sem cessar.", ref: "1 Tessalonicenses 5:17" },
  { text: "Em tudo dai graças.", ref: "1 Tessalonicenses 5:18" },
  { text: "Fiel é o que vos chama, o qual também o fará.", ref: "1 Tessalonicenses 5:24" },
  { text: "Ninguém despreze a tua mocidade.", ref: "1 Timóteo 4:12" },
  { text: "Porque o amor ao dinheiro é a raiz de toda a espécie de males.", ref: "1 Timóteo 6:10" },
  { text: "Porque Deus não nos deu o espírito de temor, mas de fortaleza, e de amor, e de moderação.", ref: "2 Timóteo 1:7" },
  { text: "A palavra de Deus é viva e eficaz.", ref: "Hebreus 4:12" },
  { text: "Cheguemos, pois, com confiança ao trono da graça.", ref: "Hebreus 4:16" },
  { text: "A fé é o firme fundamento das coisas que se esperam.", ref: "Hebreus 11:1" },
  { text: "Jesus Cristo é o mesmo, ontem, e hoje, e eternamente.", ref: "Hebreus 13:8" },
  { text: "Sede cumpridores da palavra, e não somente ouvintes.", ref: "Tiago 1:22" },
  { text: "A oração feita por um justo pode muito em seus efeitos.", ref: "Tiago 5:16" },
  { text: "Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.", ref: "1 Pedro 5:7" },
  { text: "Sede sóbrios; vigiai; porque o diabo, vosso adversário, anda em derredor.", ref: "1 Pedro 5:8" },
  { text: "Se confessarmos os nossos pecados, ele é fiel e justo para nos perdoar.", ref: "1 João 1:9" },
  { text: "Amados, amemo-nos uns aos outros; porque o amor é de Deus.", ref: "1 João 4:7" },
  { text: "Nós o amamos a ele porque ele nos amou primeiro.", ref: "1 João 4:19" },
  { text: "Eis que estou à porta, e bato.", ref: "Apocalipse 3:20" },
  { text: "Eu sou o Alfa e o Ômega, o princípio e o fim.", ref: "Apocalipse 21:6" },
  { text: "Bem-aventurado o homem que não anda segundo o conselho dos ímpios.", ref: "Salmos 1:1" },
  { text: "Servi ao Senhor com alegria.", ref: "Salmos 100:2" },
  { text: "Entrai pelas portas dele com gratidão.", ref: "Salmos 100:4" },
  { text: "Louvai ao Senhor, porque ele é bom.", ref: "Salmos 107:1" },
  { text: "Escondi a tua palavra no meu coração, para eu não pecar contra ti.", ref: "Salmos 119:11" },
  { text: "Como purificará o jovem o seu caminho? Observando-o conforme a tua palavra.", ref: "Salmos 119:9" },
  { text: "Os que confiam no Senhor serão como o monte de Sião.", ref: "Salmos 125:1" },
  { text: "Se o Senhor não edificar a casa, em vão trabalham os que a edificam.", ref: "Salmos 127:1" },
  { text: "Eis que os filhos são herança do Senhor.", ref: "Salmos 127:3" },
  { text: "Como é bom e agradável que o povo de Deus viva unido!", ref: "Salmos 133:1" },
  { text: "Sonda-me, ó Deus, e conhece o meu coração.", ref: "Salmos 139:23" },
  { text: "Tudo tem o seu tempo determinado.", ref: "Eclesiastes 3:1" },
  { text: "O cordão de três dobras não se quebra tão depressa.", ref: "Eclesiastes 4:12" },
  { text: "Lembra-te do teu Criador nos dias da tua mocidade.", ref: "Eclesiastes 12:1" },
  { text: "O povo que andava em trevas, viu uma grande luz.", ref: "Isaías 9:2" },
  { text: "Tu conservarás em paz aquele cuja mente está firme em ti.", ref: "Isaías 26:3" },
  { text: "Como são belos sobre os montes os pés do que anuncia as boas novas.", ref: "Isaías 52:7" },
  { text: "Buscai ao Senhor enquanto se pode achar.", ref: "Isaías 55:6" },
  { text: "As misericórdias do Senhor são a causa de não sermos consumidos.", ref: "Lamentações 3:22" },
  { text: "Novas são cada manhã; grande é a tua fidelidade.", ref: "Lamentações 3:23" },
  { text: "Clama a mim, e responder-te-ei.", ref: "Jeremias 33:3" },
  { text: "O Senhor é a minha porção, diz a minha alma.", ref: "Lamentações 3:24" },
  { text: "Eis que venho sem demora; guarda o que tens.", ref: "Apocalipse 3:11" },
  { text: "Bem-aventurados os que têm fome e sede de justiça.", ref: "Mateus 5:6" },
  { text: "Vós sois o sal da terra.", ref: "Mateus 5:13" },
  { text: "Vós sois a luz do mundo.", ref: "Mateus 5:14" },
  { text: "Pois onde estiver o vosso tesouro, aí estará também o vosso coração.", ref: "Mateus 6:21" },
  { text: "Assim como quereis que os homens vos façam, fazei-o vós também a eles.", ref: "Lucas 6:31" },
  { text: "Quem é fiel no mínimo, também é fiel no muito.", ref: "Lucas 16:10" },
  { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito.", ref: "João 3:16" },
  { text: "Eu sou o pão da vida.", ref: "João 6:35" },
  { text: "Se vós permanecerdes na minha palavra, verdadeiramente sereis meus discípulos.", ref: "João 8:31" },
  { text: "Eu sou o bom pastor; o bom pastor dá a sua vida pelas ovelhas.", ref: "João 10:11" },
  { text: "Um novo mandamento vos dou: Que vos ameis uns aos outros.", ref: "João 13:34" },
  { text: "Se me amardes, guardareis os meus mandamentos.", ref: "João 14:15" },
  { text: "No mundo tereis aflições, mas tende bom ânimo, eu venci o mundo.", ref: "João 16:33" },
  { text: "Arrependei-vos, e cada um de vós seja batizado.", ref: "Atos 2:38" },
  { text: "Mais bem-aventurada coisa é dar do que receber.", ref: "Atos 20:35" },
  { text: "Porque não me envergonho do evangelho de Cristo.", ref: "Romanos 1:16" },
  { text: "Todos pecaram e destituídos estão da glória de Deus.", ref: "Romanos 3:23" },
  { text: "A fé vem pelo ouvir, e o ouvir pela palavra de Deus.", ref: "Romanos 10:17" },
  { text: "Alegrai-vos com os que se alegram; e chorai com os que choram.", ref: "Romanos 12:15" },
  { text: "A ninguém devais coisa alguma, a não ser o amor recíproco.", ref: "Romanos 13:8" },
  { text: "Ora, o Deus de esperança vos encha de todo o gozo e paz.", ref: "Romanos 15:13" },
  { text: "A sabedoria deste mundo é loucura diante de Deus.", ref: "1 Coríntios 3:19" },
  { text: "Fugi da impureza.", ref: "1 Coríntios 6:18" },
  { text: "Deus ama ao que dá com alegria.", ref: "2 Coríntios 9:7" },
  { text: "Já não sou eu quem vive, mas Cristo vive em mim.", ref: "Gálatas 2:20" },
  { text: "O fruto do Espírito é: amor, gozo, paz, longanimidade, benignidade, bondade, fé.", ref: "Gálatas 5:22" },
  { text: "Não vos embriagueis com vinho, mas enchei-vos do Espírito.", ref: "Efésios 5:18" },
  { text: "Filhos, obedecei a vossos pais no Senhor, pois isto é justo.", ref: "Efésios 6:1" },
  { text: "Não andeis ansiosos por coisa alguma.", ref: "Filipenses 4:6" },
  { text: "A paz de Deus, que excede todo o entendimento, guardará os vossos corações.", ref: "Filipenses 4:7" },
  { text: "Quanto ao mais, irmãos, tudo o que é verdadeiro... nisso pensai.", ref: "Filipenses 4:8" },
  { text: "Suportando-vos uns aos outros, e perdoando-vos uns aos outros.", ref: "Colossenses 3:13" },
  { text: "E a paz de Deus, para a qual também fostes chamados em um corpo, domine em vossos corações.", ref: "Colossenses 3:15" },
  { text: "Combate o bom combate da fé.", ref: "1 Timóteo 6:12" },
  { text: "Toda boa dádiva e todo dom perfeito vêm do alto.", ref: "Tiago 1:17" },
  { text: "Resisti ao diabo, e ele fugirá de vós.", ref: "Tiago 4:7" },
  { text: "Humilhai-vos perante o Senhor, e ele vos exaltará.", ref: "Tiago 4:10" },
  { text: "Antes, santificai a Cristo, como Senhor, em vossos corações.", ref: "1 Pedro 3:15" }
]

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  
  // Estados de Interface
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState('')

  // Estados de Tempo e Versículo
  const [currentTime, setCurrentTime] = useState('')
  const [dailyVerse, setDailyVerse] = useState(VERSICULOS[0])

  useEffect(() => { 
    checkSessionAndFetch()
    
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)

    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)
    setDailyVerse(VERSICULOS[dayOfYear % VERSICULOS.length])

    return () => clearInterval(timer)
  }, [])

  const checkSessionAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    
    const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', session.user.id).single()
    
    if (profile) {
      setUserRole(profile.role)
      setMyOrgId(profile.org_id)
      if (!profile.org_id) { router.push('/setup'); return }
      await fetchOrders(profile.org_id)
    }
    setLoading(false)
  }

  const fetchOrders = async (orgId?: string) => {
    const targetOrgId = orgId || myOrgId
    if (!targetOrgId) return
    const { data, error } = await supabase.from('orders').select('*').eq('org_id', targetOrgId).in('status', ['aberta', 'pagamento']).order('created_at', { ascending: true })
    if (!error) setOrders(data || [])
  }

  const handleDeleteOrder = async (e: React.MouseEvent, id: string, label: string, total: number) => {
    e.stopPropagation() 
    if (total > 0) { if (!window.confirm(`Mesa "${label}" tem consumo de R$ ${total.toFixed(2)}. Excluir mesmo assim?`)) return }
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) setOrders(current => current.filter(order => order.id !== id))
  }

  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim() || !myOrgId) return
    setCreating(true)
    const labelFinal = newLabel.trim().toLowerCase()
    const exists = orders.find(o => o.label.toLowerCase() === labelFinal)
    if (exists) { setFeedback(`Mesa "${labelFinal}" já existe!`); setCreating(false); return }
    const { error } = await supabase.from('orders').insert([{ label: labelFinal, status: 'aberta', org_id: myOrgId }])
    if (!error) { setIsCreateModalOpen(false); setNewLabel(''); fetchOrders(myOrgId); }
    setCreating(false)
  }

  if (loading) return null

  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      <Header userRole={userRole} subtitle="OPERAÇÃO" />

      <main style={{ width: '100%', maxWidth: '1200px', padding: '20px', flex: 1 }}>
        
        {/* --- HEADER DO DASHBOARD --- */}
        <div style={{ 
          marginBottom: '25px', padding: '25px 20px', backgroundColor: 'white', borderRadius: '16px', 
          border: `1px solid ${colors.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
        }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: colors.primary, lineHeight: 1 }}>
              {currentTime || '--:--'}
            </div>
            
            <div style={{ fontSize: '0.9rem', color: colors.textMuted, textTransform: 'capitalize', marginBottom: '20px' }}>
              {dateStr}
            </div>

            <div style={{ backgroundColor: '#f8fafc', color: '#475569', padding: '12px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`, maxWidth: '500px', width: '100%' }}>
              <p style={{ margin: 0, fontStyle: 'italic', fontWeight: 600, fontSize: '0.9rem', lineHeight: '1.4' }}>“{dailyVerse.text}”</p>
              <span style={{ display: 'block', fontSize: '0.7rem', marginTop: '6px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>{dailyVerse.ref}</span>
            </div>
        </div>

        {/* TÍTULO DA SEÇÃO */}
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', color: colors.text, margin: 0, fontWeight: 800 }}>Mesas Abertas</h2>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.primary, backgroundColor: '#e0f2fe', padding: '4px 10px', borderRadius: '12px' }}>
               {orders.length} ativas
            </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {/* Card Nova Mesa */}
          <div onClick={() => { setFeedback(''); setIsCreateModalOpen(true); }} style={{ height: '130px', border: `2px dashed ${colors.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textMuted, background: 'white', transition: 'all 0.2s' }}>
            <span style={{ fontSize: '2.5rem', lineHeight: 1, fontWeight: 300 }}>+</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Nova Mesa</span>
          </div>

          {/* Cards de Mesas */}
          {orders.map((order) => (
            <div key={order.id} onClick={() => setSelectedOrder(order)}
                style={{
                  backgroundColor: order.status === 'pagamento' ? '#fffbeb' : 'white',
                  border: `2px solid ${order.status === 'pagamento' ? '#f59e0b' : colors.border}`,
                  borderRadius: '16px', padding: '15px', cursor: 'pointer', height: '130px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', transition: 'transform 0.1s'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: colors.text, textTransform: 'capitalize' }}>{order.label}</span>
                  {/* BOTÃO LIXEIRA PADRONIZADO (IconTrash + Style) */}
                  <button
                    onClick={(e) => handleDeleteOrder(e, order.id, order.label, order.total)}
                    style={{
                      background: '#fee2e2',
                      border: 'none',
                      borderRadius: '8px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ef4444',
                      cursor: 'pointer'
                    }}
                    title="Excluir Mesa"
                  >
                    <IconTrash />
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <span style={{ fontSize: '1.3rem', fontWeight: 900, color: colors.primary }}>R$ {order.total.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: `1px solid ${colors.border}50`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{order.status}</span>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: order.status === 'pagamento' ? '#f59e0b' : '#22c55e', boxShadow: order.status === 'pagamento' ? '0 0 0 2px #fcd34d' : '0 0 0 2px #86efac' }} />
                </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modais */}
      {selectedOrder && (
        <OrderDetailsModal 
          orderId={selectedOrder.id} 
          label={selectedOrder.label} 
          onClose={() => setSelectedOrder(null)} 
          onUpdate={() => fetchOrders(myOrgId!)} 
          userRole={userRole} 
        />
      )}
      
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ ...globalStyles.card, width: '85%', maxWidth: '320px', padding: '30px', borderRadius: '20px' }}>
            <h3 style={{ margin: '0 0 25px', color: colors.primary, textAlign: 'center', fontWeight: 800, fontSize: '1.5rem' }}>Abrir Mesa</h3>
            <form onSubmit={handleCreateOrder}>
              <input autoFocus value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: Mesa 10..." style={{ ...globalStyles.input, fontSize: '1.2rem', textAlign: 'center', padding: '15px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontWeight: 700 }} />
              {feedback && <p style={{ color: colors.errorText, fontSize: '0.85rem', textAlign: 'center', marginTop: '15px', fontWeight: 600 }}>{feedback}</p>}
              <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: `2px solid ${colors.border}`, background: 'white', fontWeight: 700, color: colors.textMuted }}>Cancelar</button>
                <button type="submit" disabled={creating} style={{ ...globalStyles.buttonPrimary, flex: 1, marginTop: 0, padding: '15px', borderRadius: '12px', fontSize: '1rem' }}>ABRIR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}