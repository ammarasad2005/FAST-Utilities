async function test() {
  const res = await fetch('http://localhost:3000/api/lost-found');
  const data = await res.json();
  const items = data.items || [];
  const claimedItem = items.find(i => i.claims && i.claims.length > 0);
  if (claimedItem) {
    console.log("Found claimed item:", claimedItem.id);
    const detailRes = await fetch(`http://localhost:3000/api/lost-found/${claimedItem.id}`);
    const detailData = await detailRes.json();
    console.log("Detail claims:", JSON.stringify(detailData.item.claims, null, 2));
  } else {
    console.log("No claimed items found.");
  }
}
test();
