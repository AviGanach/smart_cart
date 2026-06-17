const supabase = require('./supabaseClient');

/**
 * Get all stores with chain info
 */
async function getStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('*, store_chains ( id, name )')
    .order('store_chains(name)');

  if (error) throw error;
  return data;
}

/**
 * Find or create a store by chain name + branch info
 */
async function findOrCreateStore({ chainName, city, branchName }) {
  console.log(`🏪 Looking up store: "${chainName}" – ${city} – ${branchName}`);

  // 1. Find or create chain
  let { data: chain } = await supabase
    .from('store_chains')
    .select('id')
    .ilike('name', chainName)
    .single();

  if (!chain) {
    const { data: newChain, error } = await supabase
      .from('store_chains')
      .insert({ name: chainName })
      .select()
      .single();
    if (error) throw error;
    chain = newChain;
    console.log(`  ✅ Created new chain: ${chainName}`);
  }

  // 2. Find or create store branch
  let { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('chain_id', chain.id)
    .ilike('city', city || '')
    .ilike('branch_name', branchName || '')
    .single();

  if (!store) {
    const { data: newStore, error } = await supabase
      .from('stores')
      .insert({ chain_id: chain.id, city, branch_name: branchName })
      .select()
      .single();
    if (error) throw error;
    store = newStore;
    console.log(`  ✅ Created new store branch`);
  }

  return store;
}

module.exports = { getStores, findOrCreateStore };
