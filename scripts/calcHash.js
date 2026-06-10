import { keccak256, toBytes } from 'viem';

function check(sig) {
  console.log(`${sig}: ${keccak256(toBytes(sig))}`);
}

check("CallbackExecuted(uint256,address,bool)");
check("RequestFinalized(uint256,uint8)");
check("RequestFinalized(uint256,uint8,bytes)");
check("RequestCreated(uint256,uint256,uint256,bytes,address[])");
