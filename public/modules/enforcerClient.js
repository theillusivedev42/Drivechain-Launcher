const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

class EnforcerClient {
  constructor() {
    // Load the proto file
    const protoPath = path.join(__dirname, '../..', 'src/data/proto/cusf/mainchain/v1/validator.proto');
    const packageDefinition = protoLoader.loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [path.join(__dirname, '../..', 'src/data/proto')]
    });

    // Load the ValidatorService package
    const proto = grpc.loadPackageDefinition(packageDefinition);
    const validatorService = proto.cusf.mainchain.v1.ValidatorService;

    // Create the client
    this.client = new validatorService(
      'localhost:50051', // Default gRPC port, adjust if needed
      grpc.credentials.createInsecure()
    );
  }

  async getBlockCount() {
    return new Promise((resolve, reject) => {
      this.client.getChainTip({}, (error, response) => {
        if (error) {
          reject(error);
          return;
        }
        
        // Response contains BlockHeaderInfo with height field
        resolve(response.block_header_info.height);
      });
    });
  }
}

module.exports = EnforcerClient;
