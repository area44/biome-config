<script>
  let count = $state(0);

  function increment() {
    count += 1;
  }
</script>

<main>
  <h1>Svelte 5 Counter</h1>
  <button type="button" onclick={increment}>Clicks: {count}</button>
</main>

<style>
  main {
    text-align: center;
  }
</style>
