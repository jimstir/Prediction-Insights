#!/bin/bash

# Local Deployment Script
# Starts a local Hardhat node and deploys contracts

echo "🚀 Starting local Hardhat node..."
npx hardhat node &
NODE_PID=$!

# Wait for node to start
sleep 5

echo "📋 Deploying contracts to local network..."
npx hardhat run scripts/deploy.js --network localhost

DEPLOY_EXIT=$?

if [ $DEPLOY_EXIT -eq 0 ]; then
  echo "✅ Deployment successful!"
  echo ""
  echo "📝 Local node is running with PID: $NODE_PID"
  echo "🔌 RPC URL: http://127.0.0.1:8545"
  echo ""
  echo "To stop the node, run: kill $NODE_PID"
  echo ""
  echo "🏃 Next, run the app in another terminal:"
  echo "   npm run dev"
else
  echo "❌ Deployment failed!"
  kill $NODE_PID
  exit 1
fi

# Keep the node running
wait $NODE_PID
