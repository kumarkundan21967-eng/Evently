FROM eclipse-temurin:17-jdk AS build

WORKDIR /workspace
COPY evently/evently/ ./evently/evently/
COPY docs/ ./docs/
WORKDIR /workspace/evently/evently
RUN chmod +x mvnw && ./mvnw -B -DskipTests clean package

FROM eclipse-temurin:17-jre

WORKDIR /app
COPY --from=build /workspace/evently/evently/target/evently-0.0.1-SNAPSHOT.jar /app/evently.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/evently.jar"]
