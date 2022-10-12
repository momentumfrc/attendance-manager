docker network create -d bridge attendance \
    --subnet "172.20.0.0/24" \
    --ip-range "172.20.0.0/25" \
    --gateway "172.20.0.1"
