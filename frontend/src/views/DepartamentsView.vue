<script setup>
import { ref, onMounted } from 'vue';
import Sidebar from '@/components/Sidebar.vue';
import Button from 'primevue/button';
import Textarea from 'primevue/textarea';
import { 
  PhRobot, 
  PhPlus, 
  PhFlowArrow, 
  PhTrash, 
  PhChats, 
  PhInfo, 
  PhCheckCircle, 
  PhGear
} from '@phosphor-icons/vue';

const departaments = ref([]);
const welcomeMessage = ref('');
const loading = ref(false);

// Dialog Controls
const showDeptDialog = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const deptForm = ref({ nome: '', descricao: '', cor: '#6366f1', ordem: 1 });

const fetchDataData = async () => {
    try {
        loading.value = true;
        const [resDepts, resSettings] = await Promise.all([
            fetch('http://206.183.129.197:3000/api/departments'),
            fetch('http://206.183.129.197:3000/api/settings')
        ]);
        departaments.value = await resDepts.json();
        const settings = await resSettings.json();
        welcomeMessage.value = settings.welcomeMessage;
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const openDeptDialog = (dept = null) => {
    if (dept) {
        isEditing.value = true;
        editingId.value = dept.id;
        deptForm.value = { ...dept };
    } else {
        isEditing.value = false;
        editingId.value = null;
        deptForm.value = { nome: '', descricao: '', cor: '#6366f1', ordem: departaments.value.length + 1 };
    }
    showDeptDialog.value = true;
};

const saveDept = async () => {
    if (!deptForm.value.nome) return;
    try {
        loading.value = true;
        const method = isEditing.value ? 'PATCH' : 'POST';
        const url = isEditing.value 
            ? `http://206.183.129.197:3000/api/departments/${editingId.value}` 
            : 'http://206.183.129.197:3000/api/departments';

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deptForm.value)
        });
        showDeptDialog.value = false;
        fetchDataData();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const deleteDept = async (id) => {
    if (!confirm('Deseja excluir este departamento?')) return;
    try {
        loading.value = true;
        await fetch(`http://206.183.129.197:3000/api/departments/${id}`, { method: 'DELETE' });
        fetchDataData();
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const saveAutomation = async () => {
    try {
        loading.value = true;
        await fetch('http://206.183.129.197:3000/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ welcomeMessage: welcomeMessage.value })
        });
        alert('Configurações salvas!');
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

onMounted(fetchDataData);
</script>

<template>
  <div class="flex h-screen w-full bg-[#040406] overflow-hidden">
    <Sidebar active="departaments" />
    
    <main class="flex-1 flex flex-col h-full overflow-hidden">
        <header class="px-6 sm:px-10 py-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0a0a0c]/40 backdrop-blur-xl border-b border-white/5 gap-6">
          <div>
            <div class="flex items-center gap-4 mb-2">
              <div class="p-3 bg-purple-500/20 rounded-2xl shadow-lg">
                <PhRobot :size="36" class="text-purple-400" weight="duotone" />
              </div>
              <h1 class="text-3xl font-black text-white tracking-tighter">Bot & Setores</h1>
            </div>
            <p class="text-gray-500 text-sm font-medium">Configure sua triagem inteligente.</p>
          </div>
          <Button @click="openDeptDialog()" icon="pi pi-plus" label="Novo Departamento" class="w-full sm:w-auto px-6 h-12 bg-purple-600 border-none rounded-2xl font-bold" />
        </header>

        <div class="flex-1 p-6 sm:p-10 overflow-y-auto custom-scroll">
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start max-w-[1500px] mx-auto">
            
            <div class="flex flex-col gap-6">
              <div class="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 class="text-xl font-bold flex items-center gap-3"><PhFlowArrow :size="24" class="text-purple-400" /> Fluxo Atual</h3>
              </div>
              
              <div class="space-y-6">
                <div v-for="dept in departaments" :key="dept.id" class="p-6 sm:p-8 bg-[#0d0d0f] rounded-[2.5rem] border border-white/5 hover:border-purple-500/20 transition-all group overflow-hidden relative">
                    <div class="flex flex-col md:flex-row gap-6">
                        <div 
                          class="w-16 h-16 rounded-3xl flex items-center justify-center font-black text-2xl border shrink-0"
                          :style="{ backgroundColor: dept.color + '15', color: dept.color, borderColor: dept.color + '30' }"
                        >
                          {{ dept.id }}
                        </div>
                        <div class="flex-1 space-y-3">
                            <h4 class="font-bold text-xl text-white group-hover:text-purple-400 transition-colors">{{ dept.name }}</h4>
                            <p class="text-xs text-gray-500 leading-relaxed">{{ dept.description }}</p>
                            <div class="flex flex-wrap gap-2 pt-2">
                                <span v-for="agent in dept.agents" :key="agent" class="px-3 py-1 bg-black/40 border border-white/10 rounded-xl text-[10px] font-black text-white">{{ agent }}</span>
                                <button class="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 hover:text-white">+</button>
                            </div>
                        </div>
                        <div class="flex md:flex-col gap-2 shrink-0">
                            <button @click="openDeptDialog(dept)" class="p-3 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl transition-all border border-white/5"><PhGear :size="20" /></button>
                            <button @click="deleteDept(dept.id)" class="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all border border-red-500/10"><PhTrash :size="20" weight="fill" /></button>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            <div class="bg-[#0f0f12] p-8 sm:p-12 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"><PhRobot :size="200" weight="fill" /></div>
                
                <div class="relative z-10 flex flex-col gap-6">
                    <div class="flex items-center justify-between">
                        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                           <PhInfo :size="14" /> Saudação do Robô
                        </label>
                        <button class="text-[10px] font-black text-purple-400 uppercase tracking-widest hover:underline">Resetar</button>
                    </div>

                    <Textarea 
                      v-model="welcomeMessage" 
                      rows="10" 
                      class="w-full bg-black/40 border-white/5 text-gray-200 text-sm leading-relaxed p-6 rounded-[2rem] focus:border-purple-500/50 transition-all outline-none" 
                    />

                    <div class="p-5 bg-purple-500/10 border border-purple-500/20 rounded-3xl flex items-center gap-4">
                        <PhCheckCircle :size="28" class="text-purple-400" weight="fill" />
                        <div class="flex flex-col">
                            <span class="text-sm font-bold text-white">Lógica Mapeada</span>
                            <span class="text-[10px] text-gray-500 font-medium">As teclas 1 e 2 estão conectadas aos setores acima.</span>
                        </div>
                    </div>

                    <Button 
                      label="Publicar Treinamento" 
                      @click="saveAutomation"
                      :loading="loading"
                      class="h-16 rounded-[1.8rem] bg-purple-600 border-none font-bold text-lg shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.01]" 
                    />
                </div>
            </div>

          </div>
        </div>

        <!-- Add/Edit Dept Modal -->
        <Dialog v-model:visible="showDeptDialog" modal :header="isEditing ? 'Editar Setor' : 'Novo Departamento'" :style="{ width: '450px' }" class="p-fluid">
            <div class="flex flex-col gap-6 py-4">
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome do Setor</label>
                    <InputText v-model="deptForm.nome" placeholder="Ex: Financeiro" class="bg-black/40 border-white/10 rounded-xl h-12" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Descrição</label>
                    <Textarea v-model="deptForm.descricao" rows="3" placeholder="O que este setor faz?" class="bg-black/40 border-white/10 rounded-xl p-4" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Teclado (Ordem)</label>
                        <InputText v-model="deptForm.ordem" type="number" class="bg-black/40 border-white/10 rounded-xl h-12" />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Cor</label>
                        <div class="flex gap-2">
                            <input type="color" v-model="deptForm.cor" class="w-12 h-12 p-1 bg-black/40 border border-white/10 rounded-xl cursor-pointer" />
                            <InputText v-model="deptForm.cor" class="flex-1 bg-black/40 border-white/10 rounded-xl h-12" />
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <div class="flex gap-3 pt-4">
                    <button @click="showDeptDialog = false" class="flex-1 py-4 bg-white/5 hover:bg-white/10 text-xs font-bold text-white rounded-2xl transition-all">Cancelar</button>
                    <button @click="saveDept" class="flex-1 py-4 bg-purple-600 text-xs font-bold text-white rounded-2xl shadow-lg shadow-purple-600/20 hover:scale-[1.02] transition-all">
                        {{ isEditing ? 'Salvar Alterações' : 'Criar Setor' }}
                    </button>
                </div>
            </template>
        </Dialog>
    </main>
  </div>
</template>
