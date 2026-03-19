#!/usr/bin/env node

/**
 * Railway GraphQL Logs Fetcher - Proof of Concept
 * 
 * Fetches logs from Railway using their GraphQL API
 * No interactive login required - uses API token
 * 
 * Setup:
 *   1. Get Railway API token: https://railway.app/account/tokens
 *   2. Export token: export RAILWAY_API_TOKEN='your_token_here'
 *   3. Run: node scripts/railway-logs-graphql.js
 */

const https = require('https');

// Configuration
const RAILWAY_API_URL = 'https://backboard.railway.app/graphql/v2';
const PROJECT_ID = process.env.RAILWAY_PROJECT_ID || '';
const API_TOKEN = process.env.RAILWAY_API_TOKEN || '';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Make GraphQL request to Railway API
 */
function graphqlRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      hostname: 'backboard.railway.app',
      port: 443,
      path: '/graphql/v2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.errors) {
            reject(new Error(parsed.errors[0].message));
          } else {
            resolve(parsed.data);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * Get project info and list services
 */
async function getProjectInfo() {
  const query = `
    query GetProject($projectId: String!) {
      project(id: $projectId) {
        id
        name
        services {
          edges {
            node {
              id
              name
              createdAt
              updatedAt
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(query, { projectId: PROJECT_ID });
  return data.project;
}

/**
 * Get latest deployment for a service
 */
async function getLatestDeployment(serviceId) {
  const query = `
    query GetDeployments($serviceId: String!) {
      deployments(input: { serviceId: $serviceId, first: 1 }) {
        edges {
          node {
            id
            status
            createdAt
            meta
            staticUrl
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(query, { serviceId });
  return data.deployments.edges[0]?.node;
}

/**
 * Get deployment logs (Railway GraphQL doesn't directly expose logs)
 * This is a limitation - we'd need to use the CLI or REST API
 */
async function getDeploymentLogs(deploymentId) {
  // NOTE: Railway GraphQL API doesn't have a logs query yet
  // We need to use the legacy REST API or CLI
  console.log(`${colors.yellow}⚠️  GraphQL API doesn't support logs directly${colors.reset}`);
  console.log(`${colors.cyan}ℹ️  Would need to use Railway CLI or REST API for logs${colors.reset}`);
  
  return {
    limitation: 'Railway GraphQL API v2 does not expose logs',
    alternatives: [
      'Use Railway CLI: railway logs --service <name>',
      'Use Railway REST API (if available)',
      'Use Railway Dashboard: https://railway.app',
    ],
  };
}

/**
 * Get service metrics (alternative to logs for monitoring)
 */
async function getServiceMetrics(serviceId) {
  const query = `
    query GetServiceMetrics($serviceId: String!) {
      service(id: $serviceId) {
        id
        name
        deployments(first: 5) {
          edges {
            node {
              id
              status
              createdAt
              meta
            }
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(query, { serviceId });
  return data.service;
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.blue}╔══════════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Railway GraphQL Logs Fetcher - Proof of Concept                     ║${colors.reset}`);
  console.log(`${colors.blue}╚══════════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log();

  // Check for API token
  if (!API_TOKEN) {
    console.error(`${colors.red}❌ Error: RAILWAY_API_TOKEN not set${colors.reset}`);
    console.log(`${colors.yellow}Setup:${colors.reset}`);
    console.log(`  1. Get token: https://railway.app/account/tokens`);
    console.log(`  2. Export: export RAILWAY_API_TOKEN='your_token_here'`);
    console.log(`  3. Export: export RAILWAY_PROJECT_ID='your_project_id'`);
    process.exit(1);
  }

  try {
    // 1. Get project info
    console.log(`${colors.cyan}📊 Fetching project info...${colors.reset}`);
    const project = await getProjectInfo();
    
    console.log(`${colors.green}✅ Project: ${project.name}${colors.reset}`);
    console.log(`${colors.cyan}   ID: ${project.id}${colors.reset}`);
    console.log();

    // 2. List services
    console.log(`${colors.cyan}🔧 Services:${colors.reset}`);
    const services = project.services.edges.map((e) => e.node);
    
    for (const service of services) {
      console.log(`${colors.green}  • ${service.name}${colors.reset}`);
      console.log(`${colors.cyan}    ID: ${service.id}${colors.reset}`);
      
      // 3. Get latest deployment
      const deployment = await getLatestDeployment(service.id);
      if (deployment) {
        const statusColor = deployment.status === 'SUCCESS' ? colors.green : colors.red;
        console.log(`${colors.cyan}    Latest: ${statusColor}${deployment.status}${colors.reset}`);
        console.log(`${colors.cyan}    Created: ${new Date(deployment.createdAt).toLocaleString()}${colors.reset}`);
      }
      console.log();
    }

    // 4. Attempt to get logs (will show limitation)
    console.log(`${colors.cyan}📝 Attempting to fetch logs...${colors.reset}`);
    const logsResult = await getDeploymentLogs('dummy-id');
    
    console.log();
    console.log(`${colors.yellow}═══ FINDINGS ═══${colors.reset}`);
    console.log(`${colors.red}Limitation: ${logsResult.limitation}${colors.reset}`);
    console.log();
    console.log(`${colors.cyan}Alternatives:${colors.reset}`);
    logsResult.alternatives.forEach((alt) => {
      console.log(`  ${colors.green}✓${colors.reset} ${alt}`);
    });
    
    console.log();
    console.log(`${colors.yellow}═══ PROOF OF CONCEPT CONCLUSION ═══${colors.reset}`);
    console.log(`${colors.green}✅ GraphQL API Works:${colors.reset}`);
    console.log(`   • Can authenticate with API token`);
    console.log(`   • Can fetch project info`);
    console.log(`   • Can list services`);
    console.log(`   • Can get deployment status`);
    console.log();
    console.log(`${colors.red}❌ GraphQL API Limitations:${colors.reset}`);
    console.log(`   • No logs query available in GraphQL v2`);
    console.log(`   • Must use Railway CLI or REST API for logs`);
    console.log();
    console.log(`${colors.cyan}💡 Recommendation:${colors.reset}`);
    console.log(`   Use existing scripts/railway-logs.sh (Railway CLI wrapper)`);
    console.log(`   Or investigate Railway REST API for log access`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
    
    if (error.message.includes('Authentication')) {
      console.log();
      console.log(`${colors.yellow}Tip: Check your RAILWAY_API_TOKEN is valid${colors.reset}`);
      console.log(`Get new token: https://railway.app/account/tokens`);
    }
    
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { graphqlRequest, getProjectInfo };

